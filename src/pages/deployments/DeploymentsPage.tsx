import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, Plus, X, RefreshCw } from 'lucide-react';
import { useDeployments } from '@/hooks/useDeployments';
import { api } from '@/api/client';
import { DeploymentTable } from '@/components/features/deployments/DeploymentTable';
import { Spinner } from '@/components/ui/Spinner';
import { DeleteModal } from '@/components/ui/DeleteModal';

export default function DeploymentsPage() {
  const navigate = useNavigate();
  const { deployments, loading, error: pollError, refetch } = useDeployments();

  const [pendingDelete, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      setPending(null);
      refetch();
    } catch {
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
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                Deployments
              </h1>
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
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-200 active:translate-y-0.5 transition-all"
                onClick={() => navigate('/')}
                title="Back to Dashboard"
              >
                <Home size={15} />
                Home
              </button>
              <button
                className="flex items-center justify-center p-2.5 bg-white hover:bg-gray-200 hover:translate-y-px hover:translate-x-px text-gray-600 active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all"
                onClick={refetch}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 font-bold text-black hover:bg-gray-500 hover:text-white active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all"
                onClick={() => navigate('/deployments/new')}
              >
                <Plus size={16} strokeWidth={3} />
                New Deploy
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center justify-between gap-3 text-xs text-red-600 mb-2 animate-in fade-in slide-in-from-top-1 duration-300">
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

          {/* Table Container */}
          <div className="bg-white border border-gray-300 w-full relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="bg-white border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3 font-semibold text-sm text-slate-700">
                  <Spinner size={16} /> Syncing network...
                </div>
              </div>
            )}
            <DeploymentTable deployments={deployments} onDelete={suffix => setPending(suffix)} />
          </div>
        </div>
      </div>
    </>
  );
}
