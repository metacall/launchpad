import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, FileJson } from 'lucide-react';
import { type McConfig, buildJson } from './metacallConfig';

// Language detection
const EXT_MAP: Record<string, string> = {
  js: 'node', mjs: 'node', cjs: 'node',
  ts: 'ts',
  py: 'py', pyw: 'py',
  rb: 'rb', rake: 'rb',
  lua: 'lua',
  cs: 'cs',
  r: 'rscript',
  wasm: 'wasm',
};

const LANG_LABEL: Record<string, string> = {
  node: 'Node.js',
  ts: 'TypeScript',
  py: 'Python',
  rb: 'Ruby',
  lua: 'Lua',
  cs: 'C#',
  rscript: 'R',
  wasm: 'WASM',
};

function detectLang(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? 'node';
}


// Component
export function EditorView({
  selectedFiles,
  onDeselectFiles,
  onConfigsChange,
}: {
  selectedFiles: string[];
  onDeselectFiles: (files: string[]) => void;
  onConfigsChange?: (configs: McConfig[]) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [extraConfigs, setExtraConfigs] = useState<McConfig[]>([]);
  const [langOverrides, setLangOverrides] = useState<Record<number, string>>({});
  const nextKey = useRef(1);

  // Auto-group selected files by detected language → one tab per language
  const autoConfigs = useMemo((): McConfig[] => {
    const groups: Record<string, string[]> = {};
    for (const f of selectedFiles) {
      const lang = detectLang(f);
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push(f);
    }
    const entries = Object.entries(groups);
    if (entries.length === 0) {
      return [{ key: -1, languageId: 'node', files: [] }];
    }
    return entries.map(([lang, files], i) => ({ key: -(i + 1), languageId: lang, files }));
  }, [selectedFiles]);

  const configs: McConfig[] = [...autoConfigs, ...extraConfigs];

  // Apply any user-overridden language per tab key
  const effectiveConfigs: McConfig[] = configs.map(cfg => ({
    ...cfg,
    languageId: langOverrides[cfg.key] ?? cfg.languageId,
  }));

  const idx = Math.min(activeIdx, effectiveConfigs.length - 1);
  const current = effectiveConfigs[idx];
  const lines = buildJson(current.languageId, current.files).split('\n');

  // Delete the current tab:
  //  - extra tab (positive key) → remove from extraConfigs
  //  - auto tab  (negative key) → deselect its files in the parent tree
  //  - placeholder empty auto tab (key=-1, no files) → nothing to delete
  const handleDeleteCurrentTab = () => {
    if (current.key > 0) {
      setExtraConfigs(prev => prev.filter(c => c.key !== current.key));
      setActiveIdx(prev => Math.max(0, prev - 1));
    } else if (current.files.length > 0) {
      onDeselectFiles(current.files);
      setActiveIdx(prev => Math.max(0, prev - 1));
    }
  };

  const canDelete = current.key > 0 || current.files.length > 0;

  // Notify parent whenever the effective configs change
  useEffect(() => {
    onConfigsChange?.(effectiveConfigs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(effectiveConfigs)]);

  return (
    <div className="flex flex-col border border-gray-200 mt-2 bg-white grow h-full max-h-100">

      {/* Tab bar */}
      <div className="flex items-stretch border-b border-gray-200 bg-gray-50/50 overflow-x-auto">
        {/* Auto tabs from detected file language, label = language name only */}
        {effectiveConfigs
          .filter(cfg => cfg.key < 0)
          .map(cfg => {
            const globalI = effectiveConfigs.indexOf(cfg);
            return (
              <button
                key={cfg.key}
                onClick={() => setActiveIdx(globalI)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] border-r border-gray-200 whitespace-nowrap transition-colors shrink-0 ${
                  globalI === idx
                    ? 'bg-white text-gray-600 shadow-[inset_0_-2px_0_#3b82f6]'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="font-semibold">{LANG_LABEL[cfg.languageId] ?? cfg.languageId}</span>
                {cfg.files.length > 0 && (
                  <span className="text-[10px] text-gray-400 tabular-nums">{cfg.files.length}</span>
                )}
              </button>
            );
          })}

        {/* Extra tabs added via +, labeled MC-0, MC-1... */}
        {effectiveConfigs
          .filter(cfg => cfg.key > 0)
          .map((cfg, mcI) => {
            const globalI = effectiveConfigs.indexOf(cfg);
            return (
              <button
                key={cfg.key}
                onClick={() => setActiveIdx(globalI)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] border-r border-gray-200 whitespace-nowrap transition-colors shrink-0 ${
                  globalI === idx
                    ? 'bg-white text-gray-600 shadow-[inset_0_-2px_0_#3b82f6]'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-[10px] font-bold opacity-50 tabular-nums">MC-{mcI}</span>
                <span className="font-semibold">{LANG_LABEL[cfg.languageId] ?? cfg.languageId}</span>
              </button>
            );
          })}

        {/* Plus */}
        <button
          onClick={() => {
            const newIdx = configs.length;
            setExtraConfigs(prev => [
              ...prev,
              { key: nextKey.current++, languageId: 'node', files: [] },
            ]);
            setActiveIdx(newIdx);
          }}
          className="px-3 py-2 text-gray-400 hover:bg-gray-500 hover:text-white transition-colors shrink-0 border-r border-gray-200"
          title="Add new metacall config"
        >
          <Plus size={14} />
        </button>

        {/* Delete current tab pushed right */}
        <div className="ml-auto px-2 flex items-center">
          <button
            onClick={handleDeleteCurrentTab}
            disabled={!canDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={current.key > 0 ? 'Remove this config tab' : 'Deselect these files'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Context bar  */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-100 bg-gray-50/20 text-[11px] font-mono">
        <FileJson size={11} className="text-gray-400" />
        <span className="text-gray-500">
          {current.key > 0
            ? `metacall-mc-${effectiveConfigs.filter(c => c.key > 0).indexOf(current)}.json`
            : `metacall-${LANG_LABEL[current.languageId]?.toLowerCase().replace(/[^a-z]/g, '') ?? current.languageId}.json`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={current.languageId}
            onChange={e =>
              setLangOverrides(prev => ({ ...prev, [current.key]: e.target.value }))
            }
            className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 font-mono outline-none cursor-pointer hover:border-blue-400 transition-colors"
          >
            {Object.entries(LANG_LABEL).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <span className="text-gray-400">
            {current.files.length} script{current.files.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Code view */}
      <div className="grow flex flex-col overflow-hidden bg-white">
        <div className="flex text-[13px] font-mono leading-relaxed bg-white h-full overflow-y-auto w-full custom-scrollbar py-3">
          {/* Line numbers */}
          <div className="flex flex-col text-gray-400 px-4 text-right select-none bg-white border-r border-gray-100 min-w-12">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Syntax-highlighted code */}
          <div className="flex flex-col text-slate-800 whitespace-pre px-4">
            {lines.map((line, i) => {
              const h = line
                .replace(/"([^"]+)"(?=:)/g, '<span class="text-blue-600">"$1"</span>')
                .replace(/: "([^"]+)"/g, ': <span class="text-green-600">"$1"</span>')
                .replace(/ {4}"([^"]+)"/g, '    <span class="text-green-600">"$1"</span>');
              return <div key={i} dangerouslySetInnerHTML={{ __html: h || ' ' }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
