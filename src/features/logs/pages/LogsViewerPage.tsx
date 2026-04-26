import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Terminal, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useLogs } from '@/features/logs/hooks/useLogs';
import type { Deployment } from '@/shared/types';
import { PageLoading } from '@/shared/ui/LoadingState';
import { LogsViewer } from '@/features/logs/components/LogsViewer';

export default function LogsViewerPage() {
  const { id: suffix } = useParams();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loadingDep, setLoadingDep] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch deployment to get prefix
  useEffect(() => {
    if (!suffix) return;
    let cancelled = false;

    const fetchDeployment = async () => {
      setLoadingDep(true);
      setError(null);
      try {
        const data = await api.inspectByName(suffix);
        if (!cancelled) setDeployment(data);
      } catch (err: unknown) {
        if (!cancelled) setError((err as Error).message || 'Failed to load deployment.');
      } finally {
        if (!cancelled) setLoadingDep(false);
      }
    };

    void fetchDeployment();
    return () => {
      cancelled = true;
    };
  }, [suffix]);

  const { logs, loading: loadingLogs, error: logsError, refetch } = useLogs(suffix ?? '', deployment?.prefix ?? '');

  if (loadingDep) {
    return <PageLoading message="Loading deployment…" spinnerSize={24} />;
  }

  if (error || !deployment) {
    return (
      <div className="grow flex items-center justify-center p-6 bg-slate-50/50">
        <div className="bg-white border border-gray-200 p-8 max-w-md w-full text-center flex flex-col items-center gap-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Deployment Not Found
          </h2>
          <p className="text-sm font-medium text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/deployments')}
            className="mt-4 px-6 py-2.5 bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Deployments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-80px)] p-4 sm:p-8 pt-6 sm:pt-10 bg-slate-50/50 animate-in fade-in duration-300">
      <div className="w-full max-w-6xl flex flex-col h-[calc(100vh-140px)] min-h-125 border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/deployments/${deployment.suffix}`)}
              className="p-1.5 bg-white text-slate-600 border border-gray-200 hover:bg-gray-100 hover:text-slate-900 transition-all rounded-sm"
              title="Back to Details"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
            </button>

            <div className="h-5 w-px bg-gray-200" />

            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-slate-500 shrink-0" strokeWidth={2.5} />
              <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-none">
                Build Logs
              </h1>
            </div>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 ml-1">
              <ChevronRight size={11} className="text-gray-300" />
              <span className="text-slate-400">{deployment.prefix}</span>
              <ChevronRight size={11} className="text-gray-300" />
              <span className="font-bold text-slate-600">{deployment.suffix}</span>
            </div>
          </div>

          <button
            onClick={refetch}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-gray-50 hover:text-slate-900 transition-all disabled:opacity-50 rounded-sm"
            title="Refresh logs"
          >
            <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Logs area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading overlay — only on initial load */}
          {loadingLogs && logs.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded font-mono text-sm text-slate-200">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>Fetching logs…</span>
              </div>
            </div>
          )}

          <LogsViewer logs={logs} error={logsError} className="h-full max-h-full border-none" />
        </div>
      </div>
    </div>
  );
}
