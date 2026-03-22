import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { Deployment } from '@/types';
import type { ProgressStatusValue } from '@/components/ui/ProgressBar';

interface DeploymentTarget {
  suffix: string;
  startedAt: string;
}

interface UseDeploymentMonitorOptions {
  target: DeploymentTarget | null;
  onReady: (deployment: Deployment) => void;
  onFailed: (message: string) => void;
}

export function useDeploymentMonitor({
  target,
  onReady,
  onFailed,
}: UseDeploymentMonitorOptions) {
  const [status, setStatus] = useState<ProgressStatusValue>('create');

  useEffect(() => {
    if (!target) {
      setStatus('create');
      return;
    }

    let stopped = false;
    let timeoutId: number | null = null;
    let activeController: AbortController | null = null;

    const poll = async () => {
      if (stopped) return;

      activeController = new AbortController();

      try {
        const deployment = await api.inspectByName(target.suffix, activeController.signal);
        const nextStatus = deployment.status as ProgressStatusValue;
        setStatus(nextStatus);

        if (nextStatus === 'ready') {
          stopped = true;
          onReady(deployment);
          return;
        }

        if (nextStatus === 'error' || nextStatus === 'failed' || nextStatus === 'fail') {
          stopped = true;
          onFailed(`Deployment "${target.suffix}" failed while building.`);
          return;
        }
      } catch {
        // The deployment can take a moment to appear in the inspect list.
      }

      timeoutId = window.setTimeout(poll, 1500);
    };

    setStatus('create');
    timeoutId = window.setTimeout(poll, 900);

    return () => {
      stopped = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      activeController?.abort();
    };
  }, [onFailed, onReady, target]);

  return {
    status,
    startedAt: target?.startedAt,
  };
}
