import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, X, AlertTriangle, RefreshCw, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { useDeployments } from '@/features/deployments/hooks/useDeployments';
import { api } from '@/lib/api-client';
import { DeploymentTable } from '@/features/deployments/components/DeploymentTable';
import { DeploymentFilterBar } from '@/features/deployments/components/DeploymentFilterBar';
import {
  DEFAULT_DEPLOYMENT_FILTERS,
  getDeploymentLanguages,
  getDeploymentStatuses,
  hasActiveFilters,
  selectDeployments,
} from '@/features/deployments/lib/deploymentFilters';
import type { DeploymentFilters } from '@/features/deployments/lib/deploymentFilters';
import { LoadingOverlay } from '@/shared/ui/LoadingState';
import { DeleteModal } from '@/shared/ui/DeleteModal';
import { EmptyState } from '@/shared/ui/EmptyState';

export default function DeploymentsPage() {
  const navigate = useNavigate();
  const { deployments, loading, error: pollError, refetch } = useDeployments();

  const [pendingDelete, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DeploymentFilters>(DEFAULT_DEPLOYMENT_FILTERS);

  const statuses = useMemo(() => getDeploymentStatuses(deployments), [deployments]);
  const languages = useMemo(() => getDeploymentLanguages(deployments), [deployments]);
  const visibleDeployments = useMemo(
    () => selectDeployments(deployments, filters),
    [deployments, filters],
  );

  function updateFilters(changes: Partial<DeploymentFilters>) {
    setFilters(current => ({ ...current, ...changes }));
  }

  // Surface whichever error is currently active
  const error = deleteError ?? pollError;

  async function handleDelete() {
    if (!pendingDelete) return;
    const dep = deployments.find(d => d.suffix === pendingDelete);
    if (!dep) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deployDelete(dep.prefix, dep.suffix, dep.version ?? 'v1');
      toast.success('Deployment deleted successfully!');
      setPending(null);
      refetch();
    } catch {
      toast.error('Delete failed, check server connection.');
      setDeleteError('Delete failed, check server connection.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Delete confirmation modal */}
      {pendingDelete && (
        <DeleteModal
          suffix={pendingDelete}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            setPending(null);
            setDeleteError(null);
          }}
        />
      )}

      <div className="grow flex flex-col items-center justify-start p-4 sm:p-8 pt-6 sm:pt-10 bg-slate-50/50 animate-in fade-in duration-500">
        <div className="w-full max-w-6xl flex flex-col gap-6 relative">
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-500">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Deployments</h1>
              <p className="text-sm font-semibold text-gray-500 mt-1">
                {loading
                  ? 'Fetching active deployments…'
                  : `Tracking ${deployments.length} running deployment${
                      deployments.length !== 1 ? 's' : ''
                    }`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-200 active:translate-y-0.5 transition-all"
                onClick={() => navigate('/')}
                title="Back to Dashboard"
              >
                <Home size={15} />
                Home
              </button>
              <button
                className="flex items-center justify-center w-11 h-11 bg-white hover:bg-gray-200 hover:translate-y-px hover:translate-x-px text-gray-600 active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all"
                onClick={refetch}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 font-bold text-black hover:bg-gray-500 hover:text-white active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all"
                onClick={() => navigate('/deployments/new')}
              >
                <Plus size={16} strokeWidth={3} />
                New Deploy
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 text-xs text-red-600 mb-2 animate-in fade-in slide-in-from-top-1 duration-300">
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

          {/* Search, filter and sort controls */}
          <DeploymentFilterBar
            filters={filters}
            statuses={statuses}
            languages={languages}
            visibleCount={visibleDeployments.length}
            totalCount={deployments.length}
            onChange={updateFilters}
            onReset={() => setFilters(DEFAULT_DEPLOYMENT_FILTERS)}
          />

          {/* Table Container */}
          <div className="bg-white border border-gray-300 w-full relative">
            {loading && <LoadingOverlay message="Syncing network…" spinnerSize={16} />}
            {visibleDeployments.length === 0 && deployments.length > 0 ? (
              <EmptyState
                title="No deployments match your filters"
                description="Try a different search term or clear the filters to see all deployments."
                icon={<SearchX size={28} />}
                action={
                  hasActiveFilters(filters) ? (
                    <button
                      type="button"
                      onClick={() => setFilters(DEFAULT_DEPLOYMENT_FILTERS)}
                      className="min-h-11 border border-slate-300 px-4 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      Clear filters
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <DeploymentTable
                deployments={visibleDeployments}
                onDelete={suffix => setPending(suffix)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
