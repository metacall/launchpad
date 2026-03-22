import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';

type StatusValue = 'create' | 'ready' | 'error' | 'building' | 'failed' | 'stopped' | 'fail';

interface ProgressBarProps {
  status: StatusValue;
  createdAt?: string;
  showLabel?: boolean;
  showValue?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const BUILDING_STATUSES: StatusValue[] = ['create', 'building'];
const FAILURE_STATUSES: StatusValue[] = ['error', 'failed', 'fail'];

const STATUS_META: Record<
  StatusValue,
  {
    label: string;
    tone: string;
    track: string;
    indeterminate: boolean;
    value: number;
  }
> = {
  create: {
    label: 'Preparing',
    tone: 'from-sky-500 via-blue-500 to-cyan-400',
    track: 'bg-sky-100/80',
    indeterminate: true,
    value: 22,
  },
  building: {
    label: 'Building',
    tone: 'from-sky-500 via-blue-500 to-cyan-400',
    track: 'bg-sky-100/80',
    indeterminate: true,
    value: 34,
  },
  ready: {
    label: 'Live',
    tone: 'from-emerald-500 via-green-500 to-lime-400',
    track: 'bg-emerald-100/80',
    indeterminate: false,
    value: 100,
  },
  error: {
    label: 'Failed',
    tone: 'from-rose-500 via-red-500 to-orange-400',
    track: 'bg-rose-100/80',
    indeterminate: false,
    value: 100,
  },
  failed: {
    label: 'Failed',
    tone: 'from-rose-500 via-red-500 to-orange-400',
    track: 'bg-rose-100/80',
    indeterminate: false,
    value: 100,
  },
  fail: {
    label: 'Failed',
    tone: 'from-rose-500 via-red-500 to-orange-400',
    track: 'bg-rose-100/80',
    indeterminate: false,
    value: 100,
  },
  stopped: {
    label: 'Stopped',
    tone: 'from-slate-400 via-slate-500 to-slate-400',
    track: 'bg-slate-200',
    indeterminate: false,
    value: 0,
  },
};

function getElapsedSeconds(createdAt?: string) {
  if (!createdAt) return null;
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return null;
  return Math.max(0, (Date.now() - createdTime) / 1000);
}

export function ProgressBar({
  status,
  createdAt,
  showLabel = false,
  showValue = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const meta = STATUS_META[status] ?? STATUS_META.stopped;
  const isBuilding = BUILDING_STATUSES.includes(status);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => getElapsedSeconds(createdAt));

  useEffect(() => {
    setElapsedSeconds(getElapsedSeconds(createdAt));

    if (!isBuilding || !createdAt) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds(getElapsedSeconds(createdAt));
    }, 600);

    return () => window.clearInterval(interval);
  }, [createdAt, isBuilding]);

  const percentage = useMemo(() => {
    if (!isBuilding) return meta.value;

    if (elapsedSeconds === null) return meta.value;

    // Move quickly at first, then slow down and hold below completion until the API reports ready.
    const curved = 18 + 76 * (1 - Math.exp(-elapsedSeconds / 16));
    return Math.min(92, Math.round(curved));
  }, [elapsedSeconds, isBuilding, meta.value]);

  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {(showLabel || showValue) && (
        <div className="flex items-center justify-between gap-2">
          {showLabel ? (
            <span className={clsx('font-semibold uppercase tracking-[0.18em] text-slate-400', textClass)}>
              {meta.label}
            </span>
          ) : (
            <span />
          )}
          {showValue && (
            <span className={clsx('font-semibold text-slate-500 min-w-8 text-right tabular-nums', textClass)}>
              {percentage}%
            </span>
          )}
        </div>
      )}

      <div
        className={clsx(
          'relative flex-1 overflow-hidden rounded-full ring-1 ring-inset ring-slate-200/70',
          heightClass,
          meta.track,
        )}
        role="progressbar"
        aria-label={meta.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className={clsx(
            'absolute inset-y-0 left-0 rounded-full bg-linear-to-r transition-[width] duration-500 ease-out',
            meta.tone,
            isBuilding && 'shadow-[0_0_18px_rgba(59,130,246,0.35)]',
            FAILURE_STATUSES.includes(status) && 'shadow-[0_0_18px_rgba(239,68,68,0.22)]',
          )}
          style={{ width: `${percentage}%` }}
        />
        {meta.indeterminate && (
          <div
            className="absolute inset-y-0 w-16 -translate-x-full animate-[shimmer_1.8s_linear_infinite] bg-linear-to-r from-white/0 via-white/55 to-white/0"
          />
        )}
      </div>
    </div>
  );
}
