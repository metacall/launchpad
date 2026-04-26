import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Trash2, Box, ScrollText, Globe, Server, Layers } from 'lucide-react';
import axios from 'axios';
import { api } from '@/lib/api-client';
import { env } from '@/app/config/env';
import type { Deployment } from '@/shared/types';
import { SkeletonLoader } from '@/shared/ui/LoadingState';
import { LanguageBadge } from '@/shared/ui/LanguageBadge';
import { FunctionTester } from '@/features/deployments/components/FunctionTester';
import { CopyButton } from '@/shared/ui/CopyButton';
import { DeleteModal } from '@/shared/ui/DeleteModal';
import { getPlanLabel, resolveDeploymentPlan } from '@/shared/lib/plan';

// Helper components
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
        {label}
      </span>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{title}</span>
    </div>
  );
}

// Page
export default function DeploymentDetailPage() {
  const { id: suffix } = useParams();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const fetchDeployment = useCallback(async () => {
    if (!suffix) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.inspectByName(suffix);
      setDeployment(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          !err.response
            ? 'Unable to reach FaaS server. Check backend status and CORS settings.'
            : (err.response.data?.error ?? err.message ?? 'Failed to load deployment.'),
        );
      } else {
        setError((err as Error).message || 'Failed to load deployment.');
      }
    } finally {
      setLoading(false);
    }
  }, [suffix]);

  useEffect(() => { fetchDeployment(); }, [fetchDeployment]);

  const handleDelete = async () => {
    if (!deployment) return;
    setDeleting(true);
    try {
      await api.deployDelete(deployment.prefix, deployment.suffix, deployment.version);
      navigate('/');
    } catch (err: unknown) {
      setError('Failed to delete deployment: ' + ((err as Error).message ?? 'Unknown error'));
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // Loading
  if (loading) {
    return <DeploymentDetailSkeleton />;
  }

  // Error or not found
  if (error || !deployment) {
    const isNetwork = Boolean(error?.toLowerCase().includes('unable to reach'));
    return (
      <div className="grow flex items-center justify-center p-6">
        <div className="bg-white  max-w-md w-full text-center flex flex-col items-center gap-4">
          <div className="p-3 bg-red-50 rounded-full">
            <Box size={22} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isNetwork ? 'Server Unreachable' : 'Deployment Not Found'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">{error}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const langs = Object.keys(deployment.packages ?? {}).filter(k => k !== 'Unknown');
  const baseUrl = env.FAAS_URL;
  const invokePath = `${baseUrl}/${deployment.prefix}/${deployment.suffix}/${deployment.version}/call`;
  const deploymentPlan = getPlanLabel(
    resolveDeploymentPlan({
      suffix: deployment.suffix,
      plan: (deployment as unknown as Record<string, unknown>).plan as string | undefined,
    }),
  );
  const totalFns = Object.values(deployment.packages ?? {}).reduce(
    (acc, handles) => acc + handles.reduce((a, h) => a + (h.scope?.funcs?.length ?? 0), 0),
    0,
  );

  return (
    <>
      {showDeleteConfirm && (
        <DeleteModal
          suffix={deployment.suffix}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="flex items-stretch justify-center h-[calc(100vh-80px)] p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-6xl flex flex-col bg-white border border-slate-200 shadow-sm overflow-hidden h-full">
        <div className=" pb-3">
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-linear-to-r from-slate-500 via-slate-600 to-slate-500 transition-[width] duration-150"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
        {/* Header */}
        <div className="border-b border-slate-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4">
          {/* Left: back and name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              title="Back"
            >
              <ArrowLeft size={15} />
            </button>

            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">
                    {deployment.suffix}
                  </h1>
                  {/* <StatusBadge status={deployment.status === 'fail' ? 'error' : deployment.status ?? 'create'} /> */}
                </div>
                <div className="hidden sm:flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400 font-medium">
                  <span className="font-mono">{deployment.prefix}</span>
                  <span className="text-slate-200">·</span>
                  <span className="font-mono">{deployment.version}</span>
                  <span className="text-slate-200">·</span>
                  <span className="font-semibold text-slate-500">{deploymentPlan}</span>
                  {langs.length > 0 && (
                    <>
                      <span className="text-slate-200">·</span>
                      <div className="flex gap-1">
                        {langs.map(l => (
                          <LanguageBadge key={l} language={l} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchDeployment}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => navigate(`/deployments/${deployment.suffix}/logs`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ScrollText size={12} />
              View Logs
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-white hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>

        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left panel */}
          <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-6 bg-slate-50/40 overflow-y-auto">

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Functions', value: totalFns, icon: <Layers size={13} /> },
                { label: 'Packages', value: Object.keys(deployment.packages ?? {}).length, icon: <Box size={13} /> },
                { label: 'Plan', value: deploymentPlan, icon: <Server size={13} /> },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-1 bg-gray-50 border-slate-200 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {item.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="text-xl font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Endpoints (hidden on small screens to reduce clutter) */}
            <div className="hidden md:flex flex-col gap-3">
              <SectionTitle icon={<Globe size={13} />} title="Endpoints" />
              <InfoRow label="Base HTTP URL">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 px-2 py-1.5 font-mono text-[11px] text-slate-700 truncate">
                    {invokePath}
                  </div>
                  <div className="shrink-0">
                    <CopyButton text={invokePath} />
                  </div>
                </div>
              </InfoRow>
            </div>

            {/* Packages / Files */}
            <div className="hidden md:flex flex-col gap-3">
              <SectionTitle icon={<Box size={13} />} title="Packages" />
              {Object.entries(deployment.packages ?? {}).length === 0 ? (
                 <div className="p-3 bg-slate-100/50 rounded border border-slate-200">
                    <p className="text-xs text-slate-500">No packages deployed</p>
                 </div>
              ) : (
                <div className="flex flex-col gap-3 mt-1">
                  {Object.entries(deployment.packages ?? {}).map(([lang, handles]) => (
                     handles.length > 0 && (
                      <InfoRow key={lang} label={lang}>
                        <div className="flex flex-col gap-1.5 mt-0.5">
                          {handles.map(h => (
                            <div key={h.name} className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm">
                              <span className="text-xs font-mono text-slate-700 truncate" title={h.name}>{h.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded">{h.scope?.funcs?.length ?? 0} fns</span>
                            </div>
                          ))}
                        </div>
                      </InfoRow>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="hidden md:flex flex-col gap-3">
              <SectionTitle icon={<Server size={13} />} title="Configuration" />

              {(deployment.ports || []).length > 0 && (
              <InfoRow label="Exposed Ports">
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                {deployment.ports.map(p => (
                  <span
                  key={p}
                  className="px-2 py-1 bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-600"
                  >
                  {p}
                  </span>
                ))}
                </div>
              </InfoRow>
              )}

              {(deployment.ports || []).length === 0 && (
              <div className="p-3 bg-slate-100/50 rounded border border-slate-200">
                <p className="text-xs text-slate-500">No configuration data available</p>
                <p className="text-[10px] text-slate-400 mt-1">Environment variables and additional settings may appear here</p>
              </div>
              )}
            </div>
          </div>

          {/* Right: function tester */}
          <div className="flex-1 overflow-hidden min-h-0">
            <FunctionTester
              deployment={deployment}
              onScrollProgressChange={setScrollProgress}
            />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

function DeploymentDetailSkeleton() {
  return (
    <div className="flex items-stretch justify-center h-[calc(100vh-80px)] p-4 sm:p-6">
      <div className="w-full max-w-6xl flex flex-col bg-white border border-slate-200 shadow-sm overflow-hidden h-full">
        <div className="pb-3">
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-200 animate-pulse" style={{ width: '35%' }} />
          </div>
        </div>

        <div className="border-b border-slate-50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full">
            <span className="p-2 rounded-md border border-slate-100 bg-slate-50">
              <SkeletonLoader skeletonLines={1} className="w-4" />
            </span>
            <div className="flex flex-col gap-2 w-full">
              <SkeletonLoader skeletonLines={1} className="h-5 w-40" />
              <SkeletonLoader skeletonLines={1} className="h-4 w-60" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SkeletonLoader skeletonLines={1} className="h-8 w-20" />
            <SkeletonLoader skeletonLines={1} className="h-8 w-24" />
            <SkeletonLoader skeletonLines={1} className="h-8 w-24" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-6 bg-slate-50/40 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map(i => (
                <div key={i} className="flex flex-col gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                  <SkeletonLoader skeletonLines={1} className="h-3 w-16" />
                  <SkeletonLoader skeletonLines={1} className="h-6 w-10" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <SkeletonLoader skeletonLines={1} className="h-3 w-20" />
              <SkeletonLoader skeletonLines={2} className="h-3" />
            </div>

            <div className="flex flex-col gap-3">
              <SkeletonLoader skeletonLines={1} className="h-3 w-24" />
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <SkeletonLoader key={i} skeletonLines={1} className="h-9 w-full" />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <SkeletonLoader skeletonLines={1} className="h-3 w-24" />
              <SkeletonLoader skeletonLines={2} className="h-3" />
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-white p-5">
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-4">
                  <SkeletonLoader skeletonLines={1} className="h-4 w-36" />
                  <SkeletonLoader skeletonLines={1} className="h-3 w-64 mt-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
