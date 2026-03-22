import { useEffect, useMemo, useState } from 'react';
import { Box, CheckCircle2, Rocket, Timer } from 'lucide-react';
import { ProgressBar, type ProgressStatusValue } from '@/components/ui/ProgressBar';

interface DeploymentProgressCardProps {
  suffix: string;
  status: ProgressStatusValue;
  startedAt: string;
  sourceLabel: string;
}

const ESTIMATED_BUILD_SECONDS = 35;

function getElapsed(startedAt: string) {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.round((Date.now() - started) / 1000));
}

export function DeploymentProgressCard({
  suffix,
  status,
  startedAt,
  sourceLabel,
}: DeploymentProgressCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => getElapsed(startedAt));

  useEffect(() => {
    setElapsedSeconds(getElapsed(startedAt));

    if (status === 'ready' || status === 'failed' || status === 'fail' || status === 'error') {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(getElapsed(startedAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startedAt, status]);

  const remainingSeconds = useMemo(
    () => Math.max(0, ESTIMATED_BUILD_SECONDS - elapsedSeconds),
    [elapsedSeconds],
  );

  return (
    <div className="grow flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-linear-to-r from-sky-500 via-cyan-400 to-emerald-400" />
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-sky-50 text-sky-600 rounded-full">
              {status === 'ready' ? <CheckCircle2 size={22} /> : <Rocket size={22} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Deployment Progress
              </p>
              <h1 className="mt-2 text-xl font-bold text-slate-900">
                {status === 'ready' ? 'Deployment ready' : 'Preparing your function'}
              </h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {status === 'ready'
                  ? 'Everything is live. Opening the function page now.'
                  : `We are building ${suffix} from your ${sourceLabel.toLowerCase()}.`}
              </p>
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Deployment
                </p>
                <p className="mt-1 font-mono text-sm text-slate-800 truncate">{suffix}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
                <Box size={14} />
                <span>{sourceLabel}</span>
              </div>
            </div>

            <ProgressBar status={status} createdAt={startedAt} showLabel showValue />
          </div>

          {status !== 'ready' && (
            <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Timer size={15} className="text-slate-400" />
                <span>Estimated time left</span>
              </div>
              <span className="font-semibold tabular-nums text-slate-700">{remainingSeconds}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
