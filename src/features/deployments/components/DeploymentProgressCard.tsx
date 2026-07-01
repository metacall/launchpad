import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, XCircle, AlertCircle } from 'lucide-react';
import type { ProgressStatusValue } from '@/shared/ui/ProgressBar';

interface DeploymentProgressCardProps {
  suffix: string;
  status: ProgressStatusValue;
  startedAt: string;
  sourceLabel: string;
}

const ESTIMATED_SECONDS = 40;

const STEPS = [
  { id: 'upload',   label: 'Uploading'  },
  { id: 'build',    label: 'Building'   },
  { id: 'finalize', label: 'Finalizing' },
  { id: 'live',     label: 'Live'       },
];

const TIPS = [
  'Functions are isolated and auto-scaled on demand.',
  'Use environment variables to securely pass secrets.',
  'Your function will be live at a unique HTTP endpoint.',
  'MetaCall supports Node.js, Python, Ruby, Go, and more.',
];

function getElapsed(startedAt: string) {
  const t = new Date(startedAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / 1000);
}

function getStepIndex(elapsed: number, status: ProgressStatusValue) {
  if (status === 'ready') return 3;
  if (status === 'error' || status === 'failed' || status === 'fail') return -1;
  if (elapsed < 6) return 0;
  if (elapsed < 22) return 1;
  return 2;
}

// Smooth exponential progress: 14% → 92% while building
function calcProgress(elapsed: number, status: ProgressStatusValue) {
  if (status === 'ready') return 100;
  if (status === 'error' || status === 'failed' || status === 'fail') return 100;
  return Math.min(92, Math.round(14 + 78 * (1 - Math.exp(-elapsed / 18))));
}

export function DeploymentProgressCard({
  suffix,
  status,
  startedAt,
}: DeploymentProgressCardProps) {
  const [elapsed, setElapsed] = useState(() => getElapsed(startedAt));
  const [prevStartedAt, setPrevStartedAt] = useState(startedAt);
  const [tipIdx, setTipIdx] = useState(0);

  if (startedAt !== prevStartedAt) {
    setPrevStartedAt(startedAt);
    setElapsed(getElapsed(startedAt));
  }

  const isError   = status === 'error' || status === 'failed' || status === 'fail';
  const isDone    = status === 'ready';
  const isBuilding = !isError && !isDone;

  // Live elapsed counter
  useEffect(() => {
    if (!isBuilding) return;
    const id = window.setInterval(() => setElapsed(getElapsed(startedAt)), 500);
    return () => window.clearInterval(id);
  }, [startedAt, isBuilding]);

  // Rotate tips
  useEffect(() => {
    if (!isBuilding) return;
    const id = window.setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4500);
    return () => window.clearInterval(id);
  }, [isBuilding]);

  const pct       = useMemo(() => calcProgress(elapsed, status), [elapsed, status]);
  const remaining = useMemo(() => Math.max(0, Math.round(ESTIMATED_SECONDS - elapsed)), [elapsed]);
  const activeStep = getStepIndex(elapsed, status);

  const formatElapsed = (s: number) =>
    s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white border border-slate-200 overflow-hidden">

        {/* Animated progress line */}
        <div className="h-[2px] w-full bg-slate-100 relative overflow-hidden">
          <div
            className={`h-full transition-[width] duration-700 ease-out ${
              isError ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-blue-500'
            }`}
            style={{ width: `${pct}%` }}
          />
          {/* shimmer while building */}
          {isBuilding && (
            <div className="absolute inset-y-0 w-16 -translate-x-full animate-[shimmer_1.8s_linear_infinite] bg-gradient-to-r from-white/0 via-white/60 to-white/0" />
          )}
        </div>

        <div className="px-7 py-6 flex flex-col gap-6">

          {/* Status header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon */}
              <span className={`shrink-0 ${
                isError ? 'text-red-400' : isDone ? 'text-emerald-500' : 'text-blue-500'
              }`}>
                {isError ? (
                  <AlertCircle size={18} strokeWidth={1.8} />
                ) : isDone ? (
                  <CheckCircle2 size={18} strokeWidth={1.8} />
                ) : (
                  <Loader2 size={18} strokeWidth={1.8} className="animate-spin" />
                )}
              </span>

              {/* Name + label */}
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {isError ? 'Failed' : isDone ? 'Deployed' : 'Deploying'}
                </p>
                <p className="text-sm font-semibold text-slate-800 font-mono truncate">
                  {suffix}
                </p>
              </div>
            </div>

            {/* Percentage / elapsed */}
            <div className="shrink-0 text-right">
              {!isError && (
                <p className={`text-sm font-semibold tabular-nums ${isDone ? 'text-emerald-500' : 'text-slate-700'}`}>
                  {pct}%
                </p>
              )}
              {isBuilding && (
                <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                  {formatElapsed(elapsed)}
                </p>
              )}
            </div>
          </div>

          {/* ── Step indicators ── */}
          {!isError && (
            <div className="flex items-center gap-0">
              {STEPS.map((step, i) => {
                const done   = i < activeStep || isDone;
                const active = i === activeStep && isBuilding;
                const last   = i === STEPS.length - 1;

                return (
                  <div key={step.id} className={`flex items-center ${last ? '' : 'flex-1'}`}>
                    {/* Circle */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${
                        done
                          ? 'bg-emerald-500'
                          : active
                            ? 'bg-blue-500'
                            : 'bg-slate-100 border border-slate-200'
                      }`}>
                        {done ? (
                          <CheckCircle2 size={11} className="text-white" strokeWidth={2.5} />
                        ) : active ? (
                          <Loader2 size={11} className="text-white animate-spin" strokeWidth={2.5} />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${i > activeStep ? 'bg-slate-300' : 'bg-blue-400'}`} />
                        )}
                      </div>
                      <span className={`text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                        done ? 'text-emerald-500' : active ? 'text-blue-500' : 'text-slate-300'
                      }`}>
                        {step.label}
                      </span>
                    </div>

                    {/* Connector line */}
                    {!last && (
                      <div className={`h-[1px] flex-1 mx-1 mb-4 transition-all duration-700 ${
                        done ? 'bg-emerald-300' : active ? 'bg-blue-200' : 'bg-slate-100'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error message */}
          {isError && (
            <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3">
              <XCircle size={15} className="shrink-0 mt-0.5" strokeWidth={1.8} />
              <span>Deployment failed. Check your package and try again.</span>
            </div>
          )}

          {/* Footer */}
          {isBuilding && (
            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-50 pt-4">
              <span className="font-medium text-slate-500">Tip · </span>
              {TIPS[tipIdx]}
              <span className="float-right text-slate-300 tabular-nums">~{remaining}s</span>
            </p>
          )}

          {isDone && (
            <p className="text-[11px] text-emerald-600 font-medium border-t border-slate-50 pt-4">
              Your function is live. Redirecting…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
