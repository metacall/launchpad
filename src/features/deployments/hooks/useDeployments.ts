import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Deployment } from '@/shared/types';
import { api } from '@/lib/api-client';

interface UseDeploymentsResult {
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeployments(pollIntervalMs = 30_000): UseDeploymentsResult {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const doFetch = async () => {
      try {
        const result = await api.inspect(controller.signal);
        if (controller.signal.aborted) return;
        setDeployments(result);
        setError(null);
      } catch (err) {
        // Intentional abort — do not update state
        if (axios.isCancel(err)) return;
        if (controller.signal.aborted) return;
        setError(
          (err instanceof Error ? err.message : null) ?? 'Failed to fetch deployments',
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void doFetch();

    // Only advance the tick (triggering a new fetch) when the tab is visible
    const interval = setInterval(() => {
      if (!document.hidden) setTick(t => t + 1);
    }, pollIntervalMs);

    // Immediately re-fetch when the user returns to the tab
    const onVisible = () => {
      if (!document.hidden) setTick(t => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollIntervalMs, tick]);

  return { deployments, loading, error, refetch: () => setTick(t => t + 1) };
}
