import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Folder, ChevronDown, ChevronRight, Plus, Eye, EyeOff, AlertTriangle, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { SVGLoader } from '@/shared/ui/LoadingState';
import JSZip from 'jszip';
import type { TreeNode } from './TreeNodeView';
import { TreeNodeView } from './TreeNodeView';
import { TreeCheckbox } from './TreeCheckbox';
import { EditorView } from './EditorView';
import { type McConfig, buildJson } from './metacallConfig';
import { getPlanLabel, normalizePlan, readStoredPlan, writeStoredPlan } from '@/shared/lib/plan';

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
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [loadingZip, setLoadingZip] = useState(true);
  const [rootExpanded, setRootExpanded] = useState(true);
  const [envRows, setEnvRows] = useState<EnvRow[]>([{ id: 1, name: '', value: '' }]);
  const [mcConfigs, setMcConfigs] = useState<McConfig[]>([]);
  const [hiddenValues, setHiddenValues] = useState<Set<number>>(new Set());

  useEffect(() => {
    writeStoredPlan(plan);
  }, [plan]);

  // Parse Zip
  useEffect(() => {
    if (!file) return;

    // Guard against excessively large files that could freeze the browser
    const MAX_ZIP_BYTES = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_ZIP_BYTES) {
      setDeployError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 100 MB.`);
      setLoadingZip(false);
      return;
    }

    async function processZip() {
      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file!);
        const paths = Object.keys(zip.files);

        const root = buildTree(paths);
        setTree(root);

        // Select all files by default
        const allFiles = new Set<string>();
        Object.values(zip.files).forEach(z => {
          if (!z.dir) allFiles.add(z.name);
        });
        setSelectedPaths(allFiles);
      } catch (error) {
        console.error('Failed to parse zip', error);
      } finally {
        setLoadingZip(false);
      }
    }

    processZip();
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
    if (!file) return;
    setDeploying(true);
    setDeployError('');

    try {
      const deployName = file.name
        .replace(/\.zip$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');

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

      await api.upload(deployName, deployFile);

      const envVars = envRows
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), value: r.value }));

      const deployment = await api.deploy(deployName, envVars, plan, 'Package');
      navigate(`/deployments/${deployment.suffix}`, { replace: true });
    } catch (error) {
      console.error('Deploy failed', error);
      const err = error as { response?: { data?: string }; message?: string };
      setDeployError(err?.response?.data || err?.message || 'Failed to deploy package.');
    } finally {
      setDeploying(false);
    }
  };

  const nextEnvId = envRows.length > 0 ? Math.max(...envRows.map(r => r.id)) + 1 : 1;
  const selectedFilesArray = Array.from(selectedPaths);

  if (!file) {
    return (
      <div className="grow flex flex-col items-center justify-center p-4 bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-center max-w-sm bg-white p-8 border border-gray-200 rounded-md">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            No Deployment File Found
          </h2>
          <p className="text-sm text-slate-500 mb-4 mt-1">
            You must select a file from the Deploy Hub before configuring a deployment.
          </p>
          <button
            onClick={() => navigate('/deployments/new')}
            className="w-full px-6 py-2.5 text-gray-600 border border-gray-300 text-sm font-medium rounded hover:text-white hover:bg-gray-700 transition-colors shadow-sm"
          >
            Go to Deploy Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grow flex flex-col items-center justify-start p-4 sm:p-6 pt-8 sm:pt-12 relative overflow-hidden animate-in fade-in duration-500 bg-white">
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
                    <div
                      className="cursor-pointer"
                      onClick={() => setRootExpanded(e => !e)}
                    >
                      {rootExpanded
                        ? <ChevronDown size={14} className="text-gray-500" />
                        : <ChevronRight size={14} className="text-gray-400" />}
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

              {/* Environment Variables */}
              <div className="flex flex-col mt-4">
                <div className="flex items-center justify-between mb-3 mt-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Environment Variables
                  </h3>
                  <button
                    onClick={() => setEnvRows([...envRows, { id: nextEnvId, name: '', value: '' }])}
                    className="text-[12px] font-semibold text-blue-600 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 cursor-pointer rounded-md transition-colors border border-blue-100"
                  >
                    <Plus size={13} strokeWidth={2.5} /> Add Variable
                  </button>
                </div>

                <div className="flex flex-col">
                  {/* Column headers */}
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                    <span className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Key</span>
                    <span className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Value</span>
                    <span className="w-12 shrink-0" />
                  </div>

                  {/* Rows */}
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
                        {/* Key input */}
                        <input
                          placeholder="VARIABLE_NAME"
                          value={row.name}
                          onChange={e => {
                            const newRow = [...envRows];
                            newRow[rowIdx].name = e.target.value.toUpperCase().replace(/\s+/g, '_');
                            setEnvRows(newRow);
                          }}
                          className="flex-1 text-[12px] text-slate-700 bg-transparent border-none outline-none placeholder:text-slate-300 caret-slate-500 font-mono"
                        />

                        {/* Value input */}
                        <input
                          placeholder="value"
                          value={row.value}
                          type={hiddenValues.has(row.id) ? 'password' : 'text'}
                          onChange={e => {
                            const newRow = [...envRows];
                            newRow[rowIdx].value = e.target.value;
                            setEnvRows(newRow);
                          }}
                          className="flex-1 text-[12px] text-slate-700 bg-transparent border-none outline-none placeholder:text-slate-300 caret-slate-500 font-mono"
                        />

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0 w-12 justify-end">
                          <button
                            onClick={() =>
                              setHiddenValues(prev => {
                                const next = new Set(prev);
                                if (next.has(row.id)) { next.delete(row.id); } else { next.add(row.id); }
                                return next;
                              })
                            }
                            className={`p-1 text-slate-400 hover:text-slate-600 transition-all ${hiddenValues.has(row.id)
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
                              }`}
                            title={hiddenValues.has(row.id) ? 'Show value' : 'Hide value'}
                          >
                            {hiddenValues.has(row.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-all opacity-0 group-hover:opacity-100 text-base leading-none"
                            title="Remove Variable"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50/80 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full">
            {deployError && (
              <div className="w-full max-w-5xl flex items-center gap-2 text-xs text-red-600 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 z-20">
                <button
                  onClick={() => setDeployError('')}
                  className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                  aria-label="Clear error"
                >
                  <X size={14} />
                </button>
                <span className="text-gray-400">|</span>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{deployError}</span>
                </div>
              </div>
            )}
              </div>
              <button
                onClick={handleDeploy}
                disabled={deploying}
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
