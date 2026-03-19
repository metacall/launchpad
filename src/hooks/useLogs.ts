import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { LogEntry } from '@/types';
import { api } from '@/api/client';

interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function stripAnsi(value: string): string {
  const esc = String.fromCharCode(27);
  return value.split(esc).join('').replace(/\[[0-9;]*m/g, '');
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

    const legacyFmt = !newFmt
      ? clean.match(/^(\S+)\s+-\s+([^|]+)\|\s?(.*)$/)
      : null;

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

    const scheduleNext = (failed: boolean) => {
      if (controller.signal.aborted) return;

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
        if (controller.signal.aborted) return;
        // Don't fetch while tab is hidden; visibilitychange will kick it off
        if (!document.hidden) void doFetch();
      }, delay);
    };

    const doFetch = async () => {
      try {
        const raw = await api.logs(suffix, prefix, 'deploy', controller.signal);
        if (controller.signal.aborted) return;
        setError(null);
        setLogs(parseLogs(raw));
        scheduleNext(false);
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (controller.signal.aborted) return;
        // Surface error to the caller and widen retry interval
        const msg = axios.isAxiosError(err)
          ? (err.response?.data?.error ?? err.message ?? 'Failed to load logs.')
          : (err instanceof Error ? err.message : 'Failed to load logs.');
        setError(msg);
        scheduleNext(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    // Start immediately unless the tab is already hidden
    if (!document.hidden) {
      void doFetch();
    }

    // Kick off a fresh fetch when the user returns to the tab
    const onVisible = () => {
      if (!document.hidden && !controller.signal.aborted) {
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
        void doFetch();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      controller.abort();
      if (timerId !== null) clearTimeout(timerId);
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

