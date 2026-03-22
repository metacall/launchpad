import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeployments } from '@/hooks/useDeployments';
import { api } from '@/api/client';
import type { Deployment } from '@/types';
import { AlertTriangle, Plus, RefreshCw, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { DeploymentTable } from '@/components/features/deployments/DeploymentTable';

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
  'Essential Plan': {
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-400',
    plusHover: 'hover:bg-blue-500 hover:text-white hover:border-blue-500',
  },
  'Standard Plan': {
    headerBg: 'bg-gradient-to-r from-violet-600 to-purple-400',
    plusHover: 'hover:bg-violet-500 hover:text-white hover:border-violet-500',
  },
  'Premium Plan': {
    headerBg: 'bg-gradient-to-r from-rose-500 to-pink-400',
    plusHover: 'hover:bg-rose-500 hover:text-white hover:border-rose-500',
  },
};

const PLAN_ORDER = ['Essential Plan', 'Standard Plan', 'Premium Plan'] as const;

function getPlanClasses(plan?: string) {
  return PLAN_CLASSES[plan ?? ''] ?? PLAN_CLASSES['Essential Plan'];
}

// Deploy row
function DeployRow({ onClick, plusHover }: { onClick: () => void; plusHover: string }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className="text-sm font-medium text-gray-500">Deploy</span>
      <span
        className={`inline-flex items-center justify-center w-7 h-7 border border-gray-300 text-gray-400 transition-all ${plusHover}`}
      >
        <Plus size={13} strokeWidth={2.5} />
      </span>
    </div>
  );
}

// New Deploy card
function NewDeployCard() {
  const navigate = useNavigate();
  const { plusHover } = getPlanClasses('Free Plan');
  return (
    <div
      className="flex flex-col cursor-pointer border border-gray-200 bg-white hover:shadow-sm transition-all"
      onClick={() => navigate('/deployments/new')}
    >
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white bg-gray-500">
        <span>New Deploy</span>
        <span className="opacity-80">Free Plan</span>
      </div>
      <DeployRow onClick={() => navigate('/deployments/new')} plusHover={plusHover} />
    </div>
  );
}

// Launchpad card (active deployment)
function LaunchpadCard({ dep, onDeploy }: { dep: Deployment; onDeploy: () => void }) {
  const navigate = useNavigate();
  const plan =
    ((dep as unknown as Record<string, unknown>).plan as string | undefined) ?? 'Essential Plan';
  const { headerBg, plusHover } = getPlanClasses(plan);
  return (
    <div
      className="flex flex-col border border-dashed border-gray-300 bg-white hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/deployments/${dep.suffix}`)}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}
      >
        <span className="truncate">{dep.suffix || 'Empty launchpad'}</span>
        <span className="opacity-80 ml-2 shrink-0">{plan}</span>
      </div>
      <DeployRow onClick={() => onDeploy()} plusHover={plusHover} />
    </div>
  );
}

// Empty plan slot
function EmptyLaunchpadCard({ plan, onClick, isAlreadyUsed }: { plan: string; onClick: () => void; isAlreadyUsed?: boolean }) {
  const { headerBg, plusHover } = getPlanClasses(plan);
  const bgClass = isAlreadyUsed ? 'bg-gray-300' : headerBg;
  const hoverClass = isAlreadyUsed ? '' : plusHover;

  return (
    <div
      className={`flex flex-col border border-dashed ${isAlreadyUsed ? 'border-gray-200' : 'border-gray-300'} bg-white ${!isAlreadyUsed ? 'hover:shadow-sm cursor-pointer' : 'opacity-60 cursor-not-allowed'} transition-all`}
      onClick={!isAlreadyUsed ? onClick : undefined}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${bgClass}`}
      >
        <span>Empty launchpad</span>
        <span className="opacity-80">{plan}</span>
      </div>
      {!isAlreadyUsed && <DeployRow onClick={onClick} plusHover={hoverClass} />}
      {isAlreadyUsed && (
        <div className="flex items-center justify-between px-4 py-3.5 text-gray-400">
          <span className="text-xs font-semibold">Already in use</span>
        </div>
      )}
    </div>
  );
}

// Dashboard Page
export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
        ((d as unknown as Record<string, unknown>).plan as string | undefined) === planId,
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
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Spinner size={14} />
            <span>Fetching deployments…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-3 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="hover:text-red-800 p-1 transition-colors"
              aria-label="Clear error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Launchpad grid always shows all plan slots */}
        {!loading && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Launchpads
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <NewDeployCard />
              {launchpadSlots.map(({ planId, dep }) =>
                dep ? (
                  <LaunchpadCard
                    key={planId}
                    dep={dep}
                    onDeploy={() => navigate('/deployments/new')}
                  />
                ) : (
                  <EmptyLaunchpadCard
                    key={planId}
                    plan={planId}
                    isAlreadyUsed={deployments.some(
                      d =>
                        ((d as unknown as Record<string, unknown>).plan as string | undefined) ===
                        planId,
                    )}
                    onClick={() => navigate(deployments.length > 0 ? '/deployments/new' : '/plans')}
                  />
                ),
              )}
            </div>
          </div>
        )}

        {visibleDeployments.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Deployments
                </h2>
              </div>

              <button
                className="flex items-center justify-center p-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all"
                onClick={refetch}
                title="Refresh deployments"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="bg-white border border-gray-200 w-full relative">
              {loading && visibleDeployments.length > 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <div className="bg-white border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3 font-semibold text-sm text-slate-700">
                    <Spinner size={16} /> Syncing network...
                  </div>
                </div>
              )}
              <DeploymentTable
                deployments={visibleDeployments}
                loadingStartedAtBySuffix={loadingStartedAtBySuffix}
                onDelete={suffix => {
                  const dep = deployments.find(d => d.suffix === suffix);
                  if (dep) setPending(dep);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
