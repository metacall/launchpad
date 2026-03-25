import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface UseServerStatusResult {
  online: boolean;
  loading: boolean;
}

export function useServerStatus(pollIntervalMs = 30_000): UseServerStatusResult {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const check = async () => {
      // api.ready() has its own try/catch; check the signal after it resolves
      const isReady = await api.ready(controller.signal);
      if (controller.signal.aborted) return;
      setOnline(isReady);
      setLoading(false);
    };

    void check();

    // Only poll when the tab is active
    const interval = setInterval(() => {
      if (!document.hidden) void check();
    }, pollIntervalMs);

    // Immediately re-check when the user returns to the tab
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollIntervalMs]);

  return { online, loading };
}
