import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';

export type ProgressStatusValue =
  | 'create'
  | 'ready'
  | 'error'
  | 'building'
  | 'failed'
  | 'stopped'
  | 'fail';

interface ProgressBarProps {
  status: ProgressStatusValue;
  createdAt?: string;
  showLabel?: boolean;
  showValue?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const BUILDING_STATUSES: ProgressStatusValue[] = ['create', 'building'];
const FAILURE_STATUSES: ProgressStatusValue[] = ['error', 'failed', 'fail'];

const STATUS_META: Record<
  ProgressStatusValue,
  {
    label: string;
    tone: string;
    track: string;
    indeterminate: boolean;
    value: number;
  }
> = {
  create: {
    label: 'Loading',
    tone: 'from-sky-500 via-blue-500 to-cyan-400',
    track: 'bg-sky-100/80',
    indeterminate: true,
    value: 18,
  },
  building: {
    label: 'Loading',
    tone: 'from-sky-500 via-blue-500 to-cyan-400',
    track: 'bg-sky-100/80',
    indeterminate: true,
    value: 34,
  },
  ready: {
    label: 'Ready',
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
    }, 700);

    return () => window.clearInterval(interval);
  }, [createdAt, isBuilding]);

  const percentage = useMemo(() => {
    if (!isBuilding) return meta.value;
    if (elapsedSeconds === null) return meta.value;

    const curved = 14 + 78 * (1 - Math.exp(-elapsedSeconds / 18));
    return Math.min(92, Math.round(curved));
  }, [elapsedSeconds, isBuilding, meta.value]);

  const heightClass = size === 'xs' ? 'h-[3px]' : size === 'sm' ? 'h-1' : 'h-2';
  const textClass = size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className={clsx('flex flex-col', size === 'xs' ? 'gap-0.5' : 'gap-1', className)}>
      {(showLabel || showValue) && (
        <div className="flex items-center justify-between gap-2">
          {showLabel ? (
            <span className={clsx('font-semibold uppercase tracking-[0.16em] text-slate-400', textClass)}>
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
          'relative flex-1 overflow-hidden rounded-full bg-slate-200/80',
          heightClass,
          size === 'xs' ? 'shadow-none' : meta.track,
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
            size === 'xs'
              ? ''
              : isBuilding
                ? 'shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                : FAILURE_STATUSES.includes(status)
                  ? 'shadow-[0_0_18px_rgba(239,68,68,0.22)]'
                  : '',
          )}
          style={{ width: `${percentage}%` }}
        />
        {meta.indeterminate && (
          <div
            className={clsx(
              'absolute inset-y-0 -translate-x-full animate-[shimmer_1.8s_linear_infinite] bg-linear-to-r from-white/0 via-white/55 to-white/0',
              size === 'xs' ? 'w-8' : 'w-16',
            )}
          />
        )}
      </div>
    </div>
  );
}
