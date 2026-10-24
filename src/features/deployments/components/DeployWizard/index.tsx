import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Loader2,
  Code2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, isApiError } from '@/lib/api-client';
import { SVGLoader } from '@/shared/ui/LoadingState';
import JSZip from 'jszip';
import type { TreeNode } from './TreeNodeView';
import { TreeNodeView } from './TreeNodeView';
import { TreeCheckbox } from './TreeCheckbox';
import { EditorView } from './EditorView';
import { type McConfig, buildJson } from './metacallConfig';
import type { Deployment } from '@/shared/types';
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

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isDirectory: true, children: {} };
  for (const path of paths) {
    // JSZip paths usually don't start with / but might end with / if directory
    const parts = path.split('/').filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isDir = i < parts.length - 1 || path.endsWith('/');
      const currentPath = parts.slice(0, i + 1).join('/');

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          isDirectory: isDir,
          children: {},
        };
      }
      current = current.children[part];
    }
  }
  return root;
}

function getSafeDeployError(error: unknown, envRows: EnvRow[]): string {
  if (isApiError(error)) {
    if (!error.status) {
      return 'Unable to reach the FaaS server. Check your connection and try again.';
    }
    if (error.status === 400 || error.status === 422) {
      return 'The FaaS server rejected the request. Check the package configuration and try again.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'FaaS authorization failed. Check your access and try again.';
    }
    if (error.status === 413) {
      return 'The package is too large to upload.';
    }
    if (error.status >= 500) {
      return 'The FaaS server encountered an error. Try again shortly.';
    }
    return `The FaaS request failed (HTTP ${error.status}). Please try again.`;
  }

  const message =
    error instanceof Error
      ? error.message.split(/\r?\n/, 1)[0]
      : 'The operation could not be completed.';
  const secrets = envRows.map(row => row.value).filter(value => value.length > 0);
  const redacted = secrets.reduce(
    (safeMessage, secret) => safeMessage.split(secret).join('[redacted]'),
    message,
  );
  return redacted
    .replace(/\b(jwt|bearer)\s+\S+/gi, '$1 [redacted]')
    .replace(/\b[A-Z]:\\(?:[^\s\\]+\\)*[^\s\\]*/gi, '[path]')
    .replace(/\/(?:home|tmp|var|usr|app|workspace|Users)\/[^\s]*/gi, '[path]');
}

export default function DeployWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // State from previous page
  const file = location.state?.file as File | undefined;
  const plan = normalizePlan(
    (location.state?.plan as string | undefined) ?? searchParams.get('plan') ?? readStoredPlan(),
  );

  // Local State
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const submittingRef = useRef(false);
  const [deployTarget, setDeployTarget] = useState<{ suffix: string; startedAt: string } | null>(
    null,
  );
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [loadingZip, setLoadingZip] = useState(true);
  const [rootExpanded, setRootExpanded] = useState(true);
  const [envRows, setEnvRows] = useState<EnvRow[]>([{ id: 1, name: '', value: '' }]);
  const [mcConfigs, setMcConfigs] = useState<McConfig[]>([]);
  const [hiddenValues, setHiddenValues] = useState<Set<number>>(new Set());
  const [envExpanded, setEnvExpanded] = useState(false);

  const [subscriptions, setSubscriptions] = useState<Record<string, number>>({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [slotOccupied, setSlotOccupied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .listSubscriptions()
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
    api
      .inspect()
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
    if (loadingSubscriptions || loadingDeployments) return;
    if (plan !== 'Free') {
      if (!subscriptions[plan]) {
        navigate('/plans', { replace: true });
        return;
      }
      const activeCount = deployments.filter(
        d => normalizePlan((d as Deployment & { plan?: string }).plan) === plan,
      ).length;
      if (activeCount >= (subscriptions[plan] || 0)) {
        setSlotOccupied(true);
      }
    }
  }, [plan, subscriptions, deployments, loadingSubscriptions, loadingDeployments, navigate]);

  useEffect(() => {
    writeStoredPlan(plan);
  }, [plan]);

  // Parse Zip
  useEffect(() => {
    if (!file) return;
    let active = true;

    // Guard against excessively large files that could freeze the browser
    const MAX_ZIP_BYTES = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_ZIP_BYTES) {
      setDeployError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 100 MB.`,
      );
      setLoadingZip(false);
      return;
    }

    async function processZip() {
      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file!);
        if (!active) return;
        const paths = Object.keys(zip.files);
        const filePaths = paths.filter(path => !zip.files[path].dir);
        if (filePaths.length === 0) {
          setDeployError('The ZIP package does not contain any files.');
          setLoadingZip(false);
          return;
        }

        const root = buildTree(paths);
        setTree(root);

        // Select all files by default
        setSelectedPaths(new Set(filePaths));
        setDeployError('');
      } catch {
        if (active) setDeployError('Unable to read this ZIP package. Choose a valid ZIP file.');
      } finally {
        if (active) setLoadingZip(false);
      }
    }

    processZip();
    return () => {
      active = false;
    };
  }, [file, navigate]);

  // Helpers for Tree Toggle
  const getAllDescendantFiles = (node: TreeNode): string[] => {
    let files: string[] = [];
    if (!node.isDirectory) {
      files.push(node.path);
    } else {
      Object.values(node.children).forEach(child => {
        files = files.concat(getAllDescendantFiles(child));
      });
    }
    return files;
  };

  const findNodeByPath = (rootNode: TreeNode, targetPath: string): TreeNode | null => {
    if (rootNode.path === targetPath) return rootNode;
    for (const child of Object.values(rootNode.children)) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
    return null;
  };

  const handleToggle = (path: string, isDirectory: boolean) => {
    const next = new Set(selectedPaths);
    setDeployError('');

    if (isDirectory && tree) {
      const node = findNodeByPath(tree, path);
      if (node) {
        const descendants = getAllDescendantFiles(node);
        const allSelected = descendants.every(f => next.has(f));

        if (allSelected) {
          descendants.forEach(f => next.delete(f));
        } else {
          descendants.forEach(f => next.add(f));
        }
      }
    } else {
      if (next.has(path)) next.delete(path);
      else next.add(path);
    }

    setSelectedPaths(next);
  };

  const handleDeploy = async () => {
    if (submittingRef.current || !file) return;
    setDeployError('');

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setDeployError('Choose a valid .zip package before deploying.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setDeployError('The ZIP package exceeds the 100 MB upload limit.');
      return;
    }
    if (loadingZip) {
      setDeployError('Wait for package validation to finish before deploying.');
      return;
    }
    if (selectedPaths.size === 0) {
      setDeployError('Select at least one file to include in the deployment.');
      return;
    }

    submittingRef.current = true;

    // Compute deploy name from filename — no API needed yet
    const deployName = file.name
      .replace(/\.zip$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    // Show progress screen IMMEDIATELY, before any API calls
    const startedAt = new Date().toISOString();
    setDeployTarget({ suffix: deployName, startedAt });
    setDeploying(true);

    let operation: 'package preparation' | 'upload' | 'deployment' = 'package preparation';
    try {
      // Rebuild zip: only include user-selected files, then inject metacall-{i}.json configs
      const jszip = new JSZip();
      const originalZip = await new JSZip().loadAsync(file);
      for (const path of selectedPaths) {
        const entry = originalZip.files[path];
        if (entry && !entry.dir) {
          jszip.file(path, await entry.async('arraybuffer'));
        }
      }
      mcConfigs.forEach((cfg, i) => {
        jszip.file(`metacall-${i}.json`, buildJson(cfg.languageId, cfg.files));
      });
      const zipBlob = await jszip.generateAsync({ type: 'blob' });
      const deployFile = new File([zipBlob], file.name, { type: 'application/zip' });

      operation = 'upload';
      await api.upload(deployName, deployFile);

      const envVars = envRows
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), value: r.value }));

      operation = 'deployment';
      const deployment = await api.deploy(deployName, envVars, toDeployPlan(plan), 'Package');
      writeDeploymentPlan(deployment.suffix, plan);
      // Update with real suffix from server (in case it differs from local name)
      setDeployTarget({ suffix: deployment.suffix, startedAt });
    } catch (error) {
      const action =
        operation === 'upload'
          ? 'Upload failed'
          : operation === 'deployment'
            ? 'Deployment request failed'
            : 'Package validation failed';
      setDeployError(`${action}: ${getSafeDeployError(error, envRows)}`);
      setDeployTarget(null);
    } finally {
      submittingRef.current = false;
      setDeploying(false);
    }
  };

  const handleDeployReady = useCallback(
    (deployment: { suffix: string }) => {
      toast.success('Deployed successfully!');
      navigate(`/deployments/${deployment.suffix}`, { replace: true });
    },
    [navigate],
  );

  const handleDeployFailed = useCallback((message: string) => {
    toast.error(`Deploy failed: ${message}`);
    setDeployError(message);
    setDeployTarget(null);
  }, []);

  // Must be called before any early returns (React rules of hooks)
  const { status: deployStatus } = useDeploymentMonitor({
    target: deployTarget,
    onReady: handleDeployReady,
    onFailed: handleDeployFailed,
  });

  const nextEnvId = envRows.length > 0 ? Math.max(...envRows.map(r => r.id)) + 1 : 1;
  const selectedFilesArray = Array.from(selectedPaths);
  if (!file) {
    return (
      <div className="grow flex flex-col items-center justify-center p-6 bg-white">
        <p className="text-red-500 font-semibold mb-4">
          No deployment file found. Please select a file from the Deploy.
        </p>
        <button
          onClick={() => navigate('/deployments/new')}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Show slot occupied warning page
  if (slotOccupied) {
    return (
      <div className="grow flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-white">
        <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-lg rounded-lg animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Launchpad Slot Occupied</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            You have already deployed an application using the{' '}
            <span className="font-semibold text-slate-800">{getPlanLabel(plan)}</span>. To deploy
            another application, please delete the existing deployment first or purchase another
            slot.
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

  // Show deployment progress screen while deploying
  if (deployTarget) {
    return (
      <div className="grow flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-white">
        <DeploymentProgressCard
          suffix={deployTarget.suffix}
          status={deployStatus}
          startedAt={deployTarget.startedAt}
          sourceLabel="Package"
        />
      </div>
    );
  }

  return (
    <div className="grow flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-hidden animate-in fade-in duration-500 bg-white">
      <div className="w-full max-w-5xl bg-white border border-gray-200 shadow-sm flex flex-col z-10 transition-all rounded-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gray-50/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/deployments/new')}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-md"
              title="Back to Deploy Hub"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center  text-gray-600">
              <Folder size={18} className="fill-gray-600/20 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                Configure Deployment
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                Select files to include and configure your environment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 bg-gray-100 text-gray-600">
              Plan: <span className="text-[--color-primary]">{getPlanLabel(plan)}</span>
            </span>
          </div>
        </div>

        {/* 2-Column Content */}
        {deployError && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 sm:mx-6"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{deployError}</span>
            <button
              type="button"
              onClick={() => setDeployError('')}
              className="ml-auto shrink-0 text-red-500 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
              aria-label="Clear error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row min-h-125">
          {/* Left Column: File Tree */}
          <div className="w-full lg:w-1/3 flex flex-col p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Source Files
              </h3>
              <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                {selectedPaths.size} selected
              </span>
            </div>

            <div className="grow overflow-y-auto max-h-75 lg:max-h-none pr-2 custom-scrollbar bg-gray-50/50 border border-gray-200 rounded-md p-2 sm:p-3">
              {loadingZip ? (
                <div className="flex flex-col items-center gap-3 text-sm text-gray-500 py-10 justify-center h-full">
                  <SVGLoader variant="minimal" size={40} />
                  <span>Parsing ZIP payload…</span>
                </div>
              ) : tree ? (
                <div className="flex flex-col gap-1">
                  {/* Root row: chevron toggles expand, checkbox selects/deselects all */}
                  <div className="flex items-center gap-1.5 py-1.5 px-2 select-none hover:bg-gray-100 rounded-md transition-colors">
                    <div className="cursor-pointer" onClick={() => setRootExpanded(e => !e)}>
                      {rootExpanded ? (
                        <ChevronDown size={14} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400" />
                      )}
                    </div>
                    <TreeCheckbox
                      checked={
                        selectedPaths.size === getAllDescendantFiles(tree).length &&
                        selectedPaths.size > 0
                      }
                      partial={
                        selectedPaths.size > 0 &&
                        selectedPaths.size < getAllDescendantFiles(tree).length
                      }
                      onClick={() => {
                        const allDecs = getAllDescendantFiles(tree);
                        if (selectedPaths.size === allDecs.length) {
                          setSelectedPaths(new Set());
                        } else {
                          setSelectedPaths(new Set(allDecs));
                        }
                      }}
                    />
                    <Folder size={14} className="text-blue-500 fill-blue-50" />
                    <span
                      className="text-sm font-bold text-slate-700 truncate cursor-pointer flex-1"
                      onClick={() => setRootExpanded(e => !e)}
                    >
                      {file.name}
                    </span>
                  </div>

                  {rootExpanded && (
                    <div className="ml-1 border-l border-gray-200 pl-1 mt-1">
                      {Object.values(tree.children).map(child => (
                        <TreeNodeView
                          key={child.path}
                          node={child}
                          depth={1}
                          selectedPaths={selectedPaths}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Column: Editor & Env Vars */}
          <div className="w-full lg:w-2/3 flex flex-col bg-gray-50/20">
            {/* Configuration Settings */}
            <div className="p-4 sm:p-6 pb-0 grow flex flex-col h-full">
              <div className="grow flex flex-col h-62.5 sm:h-75 mb-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Deployment Configuration
                </h3>
                <EditorView
                  selectedFiles={selectedFilesArray}
                  onDeselectFiles={files =>
                    setSelectedPaths(prev => {
                      const next = new Set(prev);
                      files.forEach(f => next.delete(f));
                      return next;
                    })
                  }
                  onConfigsChange={setMcConfigs}
                />
              </div>

              <div className="mt-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setEnvExpanded(!envExpanded)}
                  className="w-full px-4 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <h3 className="text-sm lg:text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Code2 size={16} className="text-blue-600" strokeWidth={1.5} />
                    Environment Variables
                  </h3>
                  <div className="flex items-center gap-2">
                    {envExpanded && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEnvRows([...envRows, { id: nextEnvId, name: '', value: '' }]);
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

                {envExpanded && (
                  <div className="px-6 py-4 border-t border-slate-100 animate-in fade-in duration-200">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                        <span className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                          Key
                        </span>
                        <span className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                          Value
                        </span>
                        <span className="w-12 shrink-0" />
                      </div>

                      <div className="flex flex-col max-h-40 overflow-y-auto custom-scrollbar">
                        {envRows.length === 0 && (
                          <div className="py-4 text-[12px] text-slate-400 italic text-center">
                            No variables defined
                          </div>
                        )}
                        {envRows.map((row, rowIdx) => (
                          <div
                            key={row.id}
                            className="group flex items-center gap-3 py-2 border-b border-slate-100"
                          >
                            <input
                              placeholder="CLIENT KEY..."
                              value={row.name}
                              onChange={e => {
                                const newRow = [...envRows];
                                newRow[rowIdx].name = e.target.value
                                  .toUpperCase()
                                  .replace(/\s+/g, '_');
                                setEnvRows(newRow);
                              }}
                              className="flex-1 text-[12px] text-slate-700 bg-transparent border-none outline-none placeholder:text-gray-400/70 caret-slate-500 font-mono"
                            />

                            <input
                              placeholder="VALUE"
                              value={row.value}
                              type={hiddenValues.has(row.id) ? 'password' : 'text'}
                              onChange={e => {
                                const newRow = [...envRows];
                                newRow[rowIdx].value = e.target.value;
                                setEnvRows(newRow);
                              }}
                              className="flex-1 text-[12px] text-slate-700 bg-transparent border-none outline-none placeholder:text-gray-400/70 caret-slate-500 font-mono"
                            />

                            <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
                              <button
                                onClick={() =>
                                  setHiddenValues(prev => {
                                    const next = new Set(prev);
                                    if (next.has(row.id)) {
                                      next.delete(row.id);
                                    } else {
                                      next.add(row.id);
                                    }
                                    return next;
                                  })
                                }
                                className={`flex items-center justify-center w-7 h-7 rounded-md border border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100 hover:border-slate-200 transition-all ${
                                  hiddenValues.has(row.id)
                                    ? 'opacity-100'
                                    : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title={hiddenValues.has(row.id) ? 'Show value' : 'Hide value'}
                                aria-label={hiddenValues.has(row.id) ? 'Show value' : 'Hide value'}
                              >
                                {hiddenValues.has(row.id) ? (
                                  <EyeOff size={13} />
                                ) : (
                                  <Eye size={13} />
                                )}
                              </button>
                              <button
                                onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                                className="flex items-center justify-center w-7 h-7 rounded-md border border-transparent text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100"
                                title="Remove Variable"
                                aria-label="Remove variable"
                              >
                                <X size={13} strokeWidth={2.2} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50/80 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full">
                <span className="sr-only" aria-live="polite">
                  {deployError}
                </span>
              </div>
              <button
                onClick={handleDeploy}
                disabled={deploying || loadingZip}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 text-[15px] font-bold text-gray-600 hover:text-white bg-white border border-gray-300 rounded-md hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deploying ? <Loader2 size={16} className="animate-spin" /> : null}
                Deploy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
