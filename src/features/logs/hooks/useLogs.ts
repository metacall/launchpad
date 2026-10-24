import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/shared/types';
import { api, isAbortError, isApiError } from '@/lib/api-client';

interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function stripAnsi(value: string): string {
  const esc = String.fromCharCode(27);
  return value
    .split(esc)
    .join('')
    .replace(/\[[0-9;]*m/g, '');
}

function isTerminalStatus(status: unknown): boolean {
  return (
    status === 'ready' ||
    status === 'failed' ||
    status === 'error' ||
    status === 'fail' ||
    status === 'stopped'
  );
}

/**
 * Infer a UI log level from the stored [LEVEL] tag or message text.
 * Handles both the new format  "<ISO> [LEVEL] - <name> | <msg>"
 * and the legacy format       "<ISO> - <name> | <msg>"
 */
function parseLogs(raw: string): LogEntry[] {
  const parsedLogs: LogEntry[] = [];

  const lines = raw.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const clean = stripAnsi(line);

    // New format with explicit level:  "<ISO> [LEVEL] - <name> | <msg>"
    const newFmt = clean.match(
      /^(\S+)\s+\[(INFO|WARN|ERROR|DEBUG|HTTP)\]\s+-\s+([^|]+)\|\s?(.*)$/i,
    );

    const legacyFmt = !newFmt ? clean.match(/^(\S+)\s+-\s+([^|]+)\|\s?(.*)$/) : null;

    if (newFmt) {
      const [, ts, rawLevel, name, msg] = newFmt;
      const levelMap: Record<string, LogEntry['level']> = {
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error',
        DEBUG: 'info',
        HTTP: 'http',
      };
      let level: LogEntry['level'] = levelMap[rawLevel.toUpperCase()] ?? 'info';
      // Override: messages that explicitly say success / ready bump to success
      if (/\bsuccess\b|\bready\b|\bdone\b/i.test(msg)) level = 'success';

      const short = ts.length >= 19 ? ts.substring(11, 19) : ts;
      parsedLogs.push({ timestamp: short, level, message: `[${name.trim()}] ${msg}` });
    } else if (legacyFmt) {
      const [, ts, name, msg] = legacyFmt;
      let level: LogEntry['level'] = 'info';
      if (/error|fail/i.test(msg)) level = 'error';
      else if (/\bwarn/i.test(msg)) level = 'warn';
      else if (/\bsuccess\b|\bready\b|\bdone\b/i.test(msg)) level = 'success';
      else if (/GET |POST |HTTP\//i.test(msg)) level = 'http';

      const short = ts.length >= 19 ? ts.substring(11, 19) : ts;
      parsedLogs.push({ timestamp: short, level, message: `[${name.trim()}] ${msg}` });
    } else {
      // Unstructured line (continuation, stack trace, etc.)
      let level: LogEntry['level'] = 'info';
      if (/error|fail/i.test(clean)) level = 'error';
      else if (/\bwarn/i.test(clean)) level = 'warn';
      parsedLogs.push({ timestamp: '', level, message: clean });
    }
  }

  return parsedLogs;
}

export function useLogs(suffix: string, prefix: string, pollIntervalMs = 5000): UseLogsResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Counts consecutive fetch failures; used to widen the retry window
  const failCountRef = useRef(0);

  useEffect(() => {
    if (!suffix || !prefix) return;

    const controller = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let fetchInFlight = false;
    let terminal = false;

    const clearTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const scheduleNext = (failed: boolean) => {
      if (controller.signal.aborted || terminal) return;

      clearTimer();

      if (failed) {
        // Cap at 5 doublings.
        failCountRef.current = Math.min(failCountRef.current + 1, 5);
      } else {
        failCountRef.current = 0;
      }

      const delay = failed
        ? Math.min(pollIntervalMs * 2 ** failCountRef.current, 60_000)
        : pollIntervalMs;

      timerId = setTimeout(() => {
        timerId = null;
        if (controller.signal.aborted) return;
        // Don't fetch while tab is hidden; visibilitychange will kick it off
        if (!document.hidden) void fetchAndFinish();
      }, delay);
    };

    const doFetch = async () => {
      if (controller.signal.aborted || terminal) return;

      let failed = false;
      let failureMessage: string | null = null;

      try {
        const raw = await api.logs(suffix, prefix, 'deploy', controller.signal);
        if (controller.signal.aborted) return;
        setLogs(parseLogs(raw));
      } catch (err) {
        if (isAbortError(err)) return;
        if (controller.signal.aborted) return;
        failed = true;
        failureMessage =
          isApiError(err) || err instanceof Error
            ? (err.message ?? 'Failed to load logs.')
            : 'Failed to load logs.';
      }

      if (controller.signal.aborted) return;

      try {
        const deployment = await api.inspectByName(suffix, controller.signal);
        if (controller.signal.aborted) return;

        if (isTerminalStatus(deployment.status)) {
          terminal = true;
          clearTimer();
          setError(failureMessage);
          return;
        }
      } catch (err) {
        if (isAbortError(err)) return;
        if (controller.signal.aborted) return;
        failed = true;
        failureMessage ??=
          isApiError(err) || err instanceof Error
            ? (err.message ?? 'Failed to check deployment status.')
            : 'Failed to check deployment status.';
      }

      if (controller.signal.aborted) return;
      setError(failureMessage);
      scheduleNext(failed);
    };

    const fetchAndFinish = async () => {
      if (controller.signal.aborted || terminal || fetchInFlight) return;
      fetchInFlight = true;
      try {
        await doFetch();
      } finally {
        if (!controller.signal.aborted) {
          fetchInFlight = false;
          setLoading(false);
        }
      }
    };

    // Start immediately unless the tab is already hidden
    if (!document.hidden) {
      void fetchAndFinish();
    }

    // Kick off a fresh fetch when the user returns to the tab
    const onVisible = () => {
      if (!document.hidden && !controller.signal.aborted) {
        clearTimer();
        void fetchAndFinish();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      controller.abort();
      clearTimer();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [suffix, prefix, pollIntervalMs, tick]);

  return {
    logs,
    loading,
    error,
    refetch: () => {
      failCountRef.current = 0;
      setError(null);
      setLoading(true);
      setTick(t => t + 1);
    },
  };
}
