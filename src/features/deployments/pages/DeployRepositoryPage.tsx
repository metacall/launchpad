import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  GitBranch,
  Code2,
  ArrowLeft,
  Plus,
  AlertTriangle,
  Globe,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  FolderGit2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Spinner } from '@/shared/ui/Spinner';
import {
  getPlanLabel,
  normalizePlan,
  readStoredPlan,
  toDeployPlan,
  writeDeploymentPlan,
  writeStoredPlan,
} from '@/shared/lib/plan';
import { DeploymentProgressCard } from '@/features/deployments/components/DeploymentProgressCard';
import { useDeploymentMonitor } from '@/features/deployments/hooks/useDeploymentMonitor';

interface EnvRow {
  id: number;
  name: string;
  value: string;
}

export default function DeployRepositoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const plan = normalizePlan(
    (location.state as { plan?: string } | null)?.plan ?? searchParams.get('plan') ?? readStoredPlan(),
  );

  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchFetchError, setBranchFetchError] = useState('');
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [hiddenValues, setHiddenValues] = useState<Set<number>>(new Set());
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [envExpanded, setEnvExpanded] = useState(false);
  const [detectedLanguages, setDetectedLanguages] = useState<string>('');
  const [deployTarget, setDeployTarget] = useState<{ suffix: string; startedAt: string } | null>(null);
  // submittingLabel is set immediately on click so the progress screen renders before the API call
  const [submittingLabel, setSubmittingLabel] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [subscriptions, setSubscriptions] = useState<Record<string, number>>({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [slotOccupied, setSlotOccupied] = useState(false);

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

  useEffect(() => {
    let active = true;
    api.inspect()
      .then(deps => {
        if (active) {
          setDeployments(deps || []);
          setLoadingDeployments(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoadingDeployments(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Strict plan and subscription validation
  useEffect(() => {
    if (!plan) {
      navigate('/plans', { replace: true });
      return;
    }
    if (loadingSubscriptions || loadingDeployments) return;
    if (plan !== 'Free') {
      if (!subscriptions[plan]) {
        navigate('/plans', { replace: true });
        return;
      }
      const activeCount = deployments.filter(
        d => normalizePlan(d.plan) === plan
      ).length;
      if (activeCount >= (subscriptions[plan] || 0)) {
        setSlotOccupied(true);
      }
    }
  }, [plan, subscriptions, deployments, loadingSubscriptions, loadingDeployments, navigate]);

  useEffect(() => {
    writeStoredPlan(plan);
  }, [plan]);

  const handleDeploy = async () => {
    // Check if plan is selected
    if (!plan) {
      navigate('/plans', { replace: true });
      return;
    }

    if (!repositoryUrl.trim()) {
      setDeployError('Repository URL is required.');
      return;
    }

    // Derive a display label from the URL immediately (no API needed)
    const urlLabel = repositoryUrl.trim().replace(/\.git$/, '').split('/').filter(Boolean).pop() ?? 'repository';
    const startedAt = new Date().toISOString();

    // Show progress screen IMMEDIATELY, before any API calls
    setSubmittingLabel(urlLabel);
    setDeploying(true);
    setDeployError('');

    try {
      const branchToDeploy = branchName.trim() || 'main';
      const { id } = await api.add(repositoryUrl.trim(), branchToDeploy);

      const envVars = envRows
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), value: r.value }));

      const deployment = await api.deploy(id, envVars, toDeployPlan(plan), 'Repository');
      writeDeploymentPlan(deployment.suffix, plan);
      // Switch to the real monitor target
      setDeployTarget({ suffix: deployment.suffix, startedAt });
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      setDeployError(error?.response?.data ?? error?.message ?? 'Failed to deploy repository.');
      setDeployTarget(null);
      setSubmittingLabel(null);
    } finally {
      setDeploying(false);
    }
  };

  const handleDeployReady = useCallback((deployment: { suffix: string }) => {
    navigate(`/deployments/${deployment.suffix}`, { replace: true });
  }, [navigate]);

  const handleDeployFailed = useCallback((message: string) => {
    setDeployError(message);
    setDeployTarget(null);
  }, []);

  // Must be called unconditionally (React rules of hooks)
  const { status: deployStatus } = useDeploymentMonitor({
    target: deployTarget,
    onReady: handleDeployReady,
    onFailed: handleDeployFailed,
  });

  // Parse owner/repo from GitHub or GitLab URL
  function parseRepoInfo(url: string): { provider: 'github' | 'gitlab'; owner: string; repo: string } | null {
    try {
      const u = new URL(url.trim().replace(/\.git$/, ''));
      if (u.hostname === 'github.com') {
        const [, owner, repo] = u.pathname.split('/');
        if (owner && repo) return { provider: 'github', owner, repo };
      }
      if (u.hostname === 'gitlab.com') {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const repo = parts.pop()!;
          return { provider: 'gitlab', owner: parts.join('/'), repo };
        }
      }
    } catch {
      // invalid URL
    }
    return null;
  }

  // Auto-fetch branches when URL changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setBranches([]);
    setBranchFetchError('');
    setDetectedLanguages('');

    const info = parseRepoInfo(repositoryUrl);
    if (!info) return;

    debounceRef.current = setTimeout(async () => {
      setBranchLoading(true);
      try {
        let names: string[] = [];
        let defaultBranch = 'main';
        let rawUrl = '';

        if (info.provider === 'github') {
          rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}`;
          const [repoRes, branchRes] = await Promise.all([
            fetch(`https://api.github.com/repos/${info.owner}/${info.repo}`),
            fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/branches?per_page=100`),
          ]);
          if (!repoRes.ok) throw new Error(repoRes.status === 404 ? 'Repository not found.' : 'GitHub API error.');
          const repoData = await repoRes.json() as { default_branch?: string };
          defaultBranch = repoData.default_branch ?? 'main';
          const branchData = await branchRes.json() as { name: string }[];
          names = Array.isArray(branchData) ? branchData.map(b => b.name) : [];
        } else {
          rawUrl = `https://gitlab.com/${info.owner}/${info.repo}/-/raw`;
          const encoded = encodeURIComponent(`${info.owner}/${info.repo}`);
          const [projRes, branchRes] = await Promise.all([
            fetch(`https://gitlab.com/api/v4/projects/${encoded}`),
            fetch(`https://gitlab.com/api/v4/projects/${encoded}/repository/branches?per_page=100`),
          ]);
          if (!projRes.ok) throw new Error(projRes.status === 404 ? 'Repository not found.' : 'GitLab API error.');
          const projData = await projRes.json() as { default_branch?: string };
          defaultBranch = projData.default_branch ?? 'main';
          const branchData = await branchRes.json() as { name: string }[];
          names = Array.isArray(branchData) ? branchData.map(b => b.name) : [];
        }

        // Default branch first, rest alphabetical
        names.sort((a, b) => {
          if (a === defaultBranch) return -1;
          if (b === defaultBranch) return 1;
          return a.localeCompare(b);
        });
        setBranches(names);
        setBranchName(prev => (prev.trim() && names.includes(prev.trim()) ? prev : defaultBranch));

        // Try to detect languages from metacall.json
        try {
          const metacallUrl = `${rawUrl}/${defaultBranch}/metacall.json`;
          const metacallRes = await fetch(metacallUrl);
          if (metacallRes.ok) {
            const metacallData = await metacallRes.json() as {
              runtime?: string | string[];
              runtimes?: string[];
              language?: string;
              languages?: string[];
            };

            let langs: string[] = [];

            // Extract languages from various possible fields
            if (metacallData.runtimes && Array.isArray(metacallData.runtimes)) {
              langs = metacallData.runtimes;
            } else if (metacallData.runtime) {
              langs = Array.isArray(metacallData.runtime) ? metacallData.runtime : [metacallData.runtime];
            } else if (metacallData.languages && Array.isArray(metacallData.languages)) {
              langs = metacallData.languages;
            } else if (metacallData.language) {
              langs = [metacallData.language];
            }

            // Normalize language names
            if (langs.length > 0) {
              const normalizedLangs = langs.map(l => {
                const normalized = l.toLowerCase().trim();
                if (normalized.includes('node') || normalized.includes('javascript') || normalized.includes('js')) return 'Node.js';
                if (normalized.includes('python') || normalized.includes('py')) return 'Python';
                if (normalized.includes('ruby') || normalized.includes('rb')) return 'Ruby';
                if (normalized.includes('go') || normalized.includes('golang')) return 'Go';
                if (normalized.includes('rust')) return 'Rust';
                if (normalized.includes('java')) return 'Java';
                if (normalized.includes('dotnet') || normalized.includes('csharp') || normalized.includes('c#')) return 'C#';
                return l;
              });
              setDetectedLanguages(normalizedLangs.join(' + '));
            }
          }
        } catch {
          // Silently fail if metacall.json can't be fetched
        }
      } catch (err: unknown) {
        setBranchFetchError((err as Error).message ?? 'Could not fetch branches.');
      } finally {
        setBranchLoading(false);
      }
    }, 700);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [repositoryUrl]);

  // Show slot occupied warning page
  if (slotOccupied) {
    return (
      <div className="grow flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-white">
        <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-lg rounded-lg animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Launchpad Slot Occupied</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            You have already deployed an application using the <span className="font-semibold text-slate-800">{getPlanLabel(plan)}</span>.
            To deploy another application, please delete the existing deployment first or purchase another slot.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors rounded-sm"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/plans')}
              className="px-6 py-2 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors rounded-sm"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show deployment progress screen immediately on click (submittingLabel) or while monitoring (deployTarget)
  if (submittingLabel || deployTarget) {
    const displaySuffix = deployTarget?.suffix ?? submittingLabel ?? 'deploying';
    const displayStartedAt = deployTarget?.startedAt ?? new Date().toISOString();
    // While we're still submitting (no deployTarget yet), status stays 'create'
    const displayStatus = deployTarget ? deployStatus : 'create';

    return (
      <div className="grow flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-white">
        <DeploymentProgressCard
          suffix={displaySuffix}
          status={displayStatus}
          startedAt={displayStartedAt}
          sourceLabel="Repository"
        />
      </div>
    );
  }

  return (
    <div className="grow flex flex-col items-center justify-start p-4 sm:p-8 pt-6 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl flex flex-col gap-6">

        {/* Page Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/deployments/new')}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0 mt-1"
            title="Back"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 flex items-center justify-center bg-white">
              <FolderGit2 size={18} className="text-gray-500" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                Deploy Repository
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                Import a Git repository and deploy it as a FaaS function
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Active plan: <span className={plan ? 'text-blue-600' : 'text-red-500'}>{plan ? getPlanLabel(plan) : 'No plan selected'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Source Configuration */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <GitBranch size={16} className="text-blue-600" strokeWidth={1.5} />
              Source Configuration
            </h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Repository URL */}
            <div className="md:col-span-2 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-900">
                  Repository URL <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <Globe size={16} className="text-slate-400 shrink-0" strokeWidth={1.5} />
                  <input
                    type="url"
                    inputMode="url"
                    value={repositoryUrl}
                    onChange={e => {
                      setRepositoryUrl(e.target.value);
                      if (deployError) setDeployError('');
                    }}
                    placeholder="https://github.com/user/repo"
                    className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">Branch</label>
                  {branchLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                      <RefreshCw size={12} className="animate-spin" /> Detecting…
                    </span>
                  )}
                  {!branchLoading && branches.length > 0 && (
                    <span className="text-xs text-emerald-600 font-semibold">
                      {branches.length} branch{branches.length !== 1 ? 'es' : ''} found
                    </span>
                  )}
                </div>

                {branches.length > 0 ? (
                  <div className="relative flex items-center border border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                    <GitBranch size={16} className="absolute left-4 text-slate-400 pointer-events-none" strokeWidth={1.5} />
                    <select
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      className="w-full pl-12 pr-10 py-3 bg-transparent text-sm text-slate-800 outline-none appearance-none cursor-pointer"
                    >
                      {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 text-slate-400 pointer-events-none" strokeWidth={1.5} />
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 transition-all ${branchFetchError ? 'border-amber-300' : 'border-slate-200'}`}>
                    <GitBranch size={16} className="text-slate-400 shrink-0" strokeWidth={1.5} />
                    <input
                      type="text"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      placeholder="main"
                      className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                )}

                {branchFetchError && !branchLoading && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200/50 rounded-lg px-3 py-2.5 animate-in fade-in duration-300">
                    <button
                      onClick={() => setBranchFetchError('')}
                      className="text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0 mt-0.5"
                      title="Dismiss"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                    <span>{branchFetchError} — enter branch manually.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Panel */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-200/50 rounded-lg p-4 text-xs leading-relaxed text-blue-900">
                <p className="font-semibold mb-2">Requirement</p>
                <p>Your repository must include a <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[11px]">metacall.json</code> at the root.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Framework Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Languages</span>
                    <span className="font-semibold text-gray-600">
                      {detectedLanguages ? detectedLanguages : (branchLoading ? 'Detecting…' : 'Not detected')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Root Path</span>
                    <span className="font-mono text-slate-900">/</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Variables - Collapsible */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setEnvExpanded(!envExpanded)}
            className="w-full px-4 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between"
          >
            <h2 className="text-sm lg:text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Code2 size={16} className="text-blue-600" strokeWidth={1.5} />
              Environment Variables
            </h2>
            <div className="flex items-center gap-2">
              {envExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newId = envRows.length > 0 ? Math.max(...envRows.map(r => r.id)) + 1 : 1;
                    setEnvRows([...envRows, { id: newId, name: '', value: '' }]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Add environment variable"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span className="hidden sm:inline">Add Var</span>
                </button>
              )}
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${envExpanded ? 'rotate-180' : ''}`}
                strokeWidth={1.5}
              />
            </div>
          </button>

          {/* Expandable Content */}
          {envExpanded && (
            <div className="px-6 py-4 border-t border-slate-100 animate-in fade-in duration-200">
              {envRows.length > 0 && (
                <div className="mb-4">
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_80px] gap-4 pb-3 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Key</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Value</span>
                    <span />
                  </div>

                  {envRows.map((row, idx) => (
                    <div key={row.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_80px] gap-3 sm:items-center py-3 border-b border-slate-100 last:border-b-0 group">
                      <div className="flex flex-col sm:contents gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase sm:hidden">Key</span>
                        <input
                          placeholder="VAR_NAME"
                          value={row.name}
                          onChange={e => {
                            const updated = [...envRows];
                            updated[idx] = {
                              ...updated[idx],
                              name: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                            };
                            setEnvRows(updated);
                          }}
                          className="border border-slate-200 bg-slate-50 rounded px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        />
                      </div>

                      <div className="flex flex-col sm:contents gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase sm:hidden">Value</span>
                        <input
                          placeholder="value"
                          value={row.value}
                          type={hiddenValues.has(row.id) ? 'password' : 'text'}
                          onChange={e => {
                            const updated = [...envRows];
                            updated[idx] = { ...updated[idx], value: e.target.value };
                            setEnvRows(updated);
                          }}
                          className="border border-slate-200 bg-slate-50 rounded px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-1 sm:justify-center">
                        <button
                          onClick={() => {
                            const next = new Set(hiddenValues);
                            next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                            setHiddenValues(next);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title={hiddenValues.has(row.id) ? 'Show' : 'Hide'}
                        >
                          {hiddenValues.has(row.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Delete"
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
        </div>
        {/* Error Banner */}
        {deployError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 animate-in fade-in duration-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 text-sm">{deployError}</div>
            <button
              onClick={() => setDeployError('')}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDeploy}
            disabled={deploying || !repositoryUrl.trim() || !plan}
            className="flex items-center justify-center gap-2 px-8 py-2.5  text-black border text-sm font-bold hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={!plan ? 'Select a plan first to deploy' : !repositoryUrl.trim() ? 'Enter repository URL to deploy' : ''}
          >
            {deploying && <Spinner size={14} />}
            {deploying ? 'Deploying…' : 'Deploy Repository'}
          </button>
        </div>
      </div>
    </div>
  );
}
