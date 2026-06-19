import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeployments } from '@/features/deployments/hooks/useDeployments';
import { api } from '@/lib/api-client';
import type { Deployment } from '@/shared/types';
import { AlertTriangle, Plus, RefreshCw, X } from 'lucide-react';
import { DeleteModal } from '@/shared/ui/DeleteModal';

import { DeploymentTable } from '@/features/deployments/components/DeploymentTable';
import {
  FREE_PLAN,
  getPlanLabel,
  normalizePlan,
  resolveDeploymentPlan,
  writeStoredPlan,
} from '@/shared/lib/plan';
import { Plans } from '@metacall/protocol/plan';

interface PendingDeploymentEntry {
  suffix: string;
  startedAt: string;
}

const PENDING_DEPLOYMENTS_KEY = 'pending_deployments';

function readPendingDeployments(): PendingDeploymentEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(PENDING_DEPLOYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingDeploymentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingDeployments(entries: PendingDeploymentEntry[]) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PENDING_DEPLOYMENTS_KEY, JSON.stringify(entries));
}

// Plan config
const PLAN_CLASSES: Record<string, { headerBg: string; plusHover: string }> = {
  Free: {
    headerBg: 'bg-gradient-to-r from-gray-600 to-gray-400',
    plusHover: 'hover:bg-gray-500 hover:text-white hover:border-gray-500',
  },
  [Plans.Essential]: {
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-400',
    plusHover: 'hover:bg-blue-500 hover:text-white hover:border-blue-500',
  },
  [Plans.Standard]: {
    headerBg: 'bg-gradient-to-r from-violet-600 to-purple-400',
    plusHover: 'hover:bg-violet-500 hover:text-white hover:border-violet-500',
  },
  [Plans.Premium]: {
    headerBg: 'bg-gradient-to-r from-rose-500 to-pink-400',
    plusHover: 'hover:bg-rose-500 hover:text-white hover:border-rose-500',
  },
};

const PLAN_ORDER = [Plans.Essential, Plans.Standard, Plans.Premium] as const;

function getPlanClasses(plan?: string) {
  return PLAN_CLASSES[normalizePlan(plan)] ?? PLAN_CLASSES[Plans.Essential];
}

// Deploy row
function DeployRow({ onClick, plusHover }: { onClick: () => void; plusHover: string }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className="text-smd font-medium text-gray-500">Deploy</span>
      <span
        className={`inline-flex items-center justify-center w-8 h-7 border border-gray-300 text-gray-400 transition-all ${plusHover}`}
      >
        <Plus size={20} strokeWidth={2} />
      </span>
    </div>
  );
}

// free Deploy card
function NewDeployCard() {
  const navigate = useNavigate();
  const { plusHover } = PLAN_CLASSES.Free;
  return (
    <div
      className="flex flex-col cursor-pointer border border-gray-200 bg-white hover:shadow-sm transition-all"
      onClick={() => navigate('/deployments/new', { state: { plan: FREE_PLAN } })}
    >
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white bg-gray-500">
        <span>New Deploy</span>
        <span className="opacity-80">Free Plan</span>
      </div>
      <DeployRow
        onClick={() => navigate('/deployments/new', { state: { plan: FREE_PLAN } })}
        plusHover={plusHover}
      />
    </div>
  );
}

// Launchpad card (active deployment)
function LaunchpadCard({ dep }: { dep: Deployment }) {
  const navigate = useNavigate();
  const plan = resolveDeploymentPlan({
    suffix: dep.suffix,
    plan: (dep as unknown as Record<string, unknown>).plan as string | undefined,
  });
  const { headerBg } = getPlanClasses(plan);
  return (
    <div
      className="flex flex-col border border-dashed border-gray-300 bg-white hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/deployments/${dep.suffix}`)}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}
      >
        <span className="truncate">{dep.suffix || 'Empty launchpad'}</span>
        <span className="opacity-80 ml-2 shrink-0">{getPlanLabel(plan)}</span>
      </div>
      <div className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors">
        <span className="text-smd font-medium text-slate-700">Manage Function</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
          Active
        </span>
      </div>
    </div>
  );
}

// Empty plan slot
function EmptyLaunchpadCard({
  plan,
  onClick,
  isAlreadyUsed,
  hasSubscription = true,
}: {
  plan: string;
  onClick: () => void;
  isAlreadyUsed?: boolean;
  hasSubscription?: boolean;
}) {
  const { headerBg, plusHover } = getPlanClasses(plan);
  const bgClass = !hasSubscription ? 'bg-gray-400' : (isAlreadyUsed ? 'bg-gray-300' : headerBg);
  const hoverClass = !hasSubscription ? 'hover:bg-slate-700 hover:text-white hover:border-slate-700' : (isAlreadyUsed ? '' : plusHover);

  return (
    <div
      className={`flex flex-col border border-dashed ${
        !hasSubscription ? 'border-gray-300' : (isAlreadyUsed ? 'border-gray-200' : 'border-gray-300')
      } bg-white hover:shadow-sm cursor-pointer transition-all`}
      onClick={onClick}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${bgClass}`}
      >
        <span>{!hasSubscription ? 'Locked slot' : 'Empty launchpad'}</span>
        <span className="opacity-80">
          {!hasSubscription ? 'Inactive' : getPlanLabel(plan)}
        </span>
      </div>
      <div
        className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <span className="text-smd font-medium text-gray-500">
          {!hasSubscription ? 'Activate Plan' : 'Deploy'}
        </span>
        <span
          className={`inline-flex items-center justify-center w-8 h-7 border border-gray-300 text-gray-400 transition-all ${hoverClass}`}
        >
          +
        </span>
      </div>
    </div>
  );
}

// Dashboard Page
export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [subscriptions, setSubscriptions] = useState<Record<string, number>>({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);

  useEffect(() => {
    let active = true;
    api.listSubscriptions()
      .then(subs => {
        if (active) {
          setSubscriptions(subs || {});
          setLoadingSubscriptions(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoadingSubscriptions(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const [pendingDeployments, setPendingDeployments] = useState<PendingDeploymentEntry[]>(
    () => readPendingDeployments(),
  );
  const hasPendingDeployments = pendingDeployments.length > 0;
  const {
    deployments,
    loading,
    error: pollError,
    refetch,
  } = useDeployments(hasPendingDeployments ? 3_000 : 30_000);

  const [pendingDelete, setPending] = useState<Deployment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const error = deleteError ?? pollError;

  useEffect(() => {
    writePendingDeployments(pendingDeployments);
  }, [pendingDeployments]);

  useEffect(() => {
    const incoming = location.state as { pendingDeployment?: PendingDeploymentEntry } | null;
    const entry = incoming?.pendingDeployment;
    if (!entry?.suffix || !entry.startedAt) return;

    setPendingDeployments(current => {
      if (current.some(item => item.suffix === entry.suffix)) return current;
      return [...current, entry];
    });
  }, [location.state]);

  useEffect(() => {
    if (pendingDeployments.length === 0) return;

    setPendingDeployments(current =>
      current.filter(entry => {
        const deployment = deployments.find(dep => dep.suffix === entry.suffix);
        if (!deployment) return true;
        const status = deployment.status as 'create' | 'building' | 'ready' | 'fail';
        return status === 'create' || status === 'building';
      }),
    );
  }, [deployments, pendingDeployments.length]);

  const loadingStartedAtBySuffix = useMemo(
    () =>
      Object.fromEntries(
        pendingDeployments.map(entry => [entry.suffix, entry.startedAt] as const),
      ),
    [pendingDeployments],
  );

  const placeholderDeployments = pendingDeployments
    .filter(entry => !deployments.some(dep => dep.suffix === entry.suffix))
    .map(
      entry =>
        ({
          prefix: 'metacall',
          suffix: entry.suffix,
          version: 'v1',
          packages: {} as Deployment['packages'],
          ports: [],
          status: 'create',
        }) as unknown as Deployment,
    );

  const visibleDeployments = [...placeholderDeployments, ...deployments];

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deployDelete(
        pendingDelete.prefix,
        pendingDelete.suffix,
        pendingDelete.version ?? 'v1',
      );
      setPending(null);
      refetch();
    } catch (err: unknown) {
      setDeleteError('Failed to delete deployment: ' + ((err as Error).message ?? 'Unknown error'));
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  // Build one slot per plan occupied slots show the real deployment, empty ones show placeholder
  const launchpadSlots = PLAN_ORDER.map(planId => {
    const dep = deployments.find(
      d =>
        normalizePlan((d as unknown as Record<string, unknown>).plan as string | undefined) === planId,
    );
    return { planId, dep: dep ?? null };
  });

  return (
    <>
      {/* Delete confirmation modal */}
      {pendingDelete && (
        <DeleteModal
          suffix={pendingDelete.suffix}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            setPending(null);
            setDeleteError(null);
          }}
        />
      )}

      <div className="flex flex-col gap-8">
        {error && (
          <div className="flex items-center gap-3 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-300">
            <button
              onClick={() => setDeleteError(null)}
              className="hover:text-red-800 transition-colors flex-shrink-0"
              aria-label="Clear error"
            >
              <X size={14} />
            </button>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ── Launchpad grid — renders instantly from static plan structure ── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
            Launchpads
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <NewDeployCard />
            {launchpadSlots.map(({ planId, dep }) =>
              dep ? (
                <LaunchpadCard
                  key={planId}
                  dep={dep}
                />
              ) : (
                <EmptyLaunchpadCard
                  key={planId}
                  plan={planId}
                  isAlreadyUsed={deployments.some(
                    d =>
                      normalizePlan(
                        (d as unknown as Record<string, unknown>).plan as string | undefined,
                      ) === planId,
                  )}
                  hasSubscription={true}
                  onClick={() => {
                    writeStoredPlan(planId);
                    if (loadingSubscriptions || subscriptions[planId]) {
                      navigate('/deployments/new', { state: { plan: planId } });
                    } else {
                      navigate('/plans', { state: { plan: planId } });
                    }
                  }}
                />
              ),
            )}
          </div>
        </div>


        {/* Deployments section */}
        {(loading || visibleDeployments.length > 0) && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                Deployments
              </h2>
              <button
                className="flex items-center justify-center p-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all animate-in fade-in"
                onClick={refetch}
                title="Refresh deployments"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="bg-white border border-gray-200 relative overflow-hidden">
              {visibleDeployments.length > 0 ? (
                <DeploymentTable
                  deployments={visibleDeployments}
                  loadingStartedAtBySuffix={loadingStartedAtBySuffix}
                  onDelete={suffix => {
                    const dep = deployments.find(d => d.suffix === suffix);
                    if (dep) setPending(dep);
                  }}
                />
              ) : (
                <div className="w-full py-10 px-4 flex items-center justify-center gap-2 text-slate-500 font-medium text-xs animate-in fade-in">
                  <RefreshCw className="animate-spin text-slate-400" size={14} />
                  Fetching deployments...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
