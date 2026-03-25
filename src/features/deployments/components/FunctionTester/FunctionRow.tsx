import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Spinner } from '@/shared/ui/Spinner';
import { CopyButton } from '@/shared/ui/CopyButton';
import type { FuncEntry } from './types';

interface FunctionRowProps {
  func: FuncEntry;
  endpoint: string;
  isOpen: boolean;
  onToggle: () => void;
  prefix: string;
  suffix: string;
  version: string;
}

export function FunctionRow({
  func,
  endpoint,
  isOpen,
  onToggle,
  prefix,
  suffix,
  version,
}: FunctionRowProps) {
  const buildDefaultArgs = () => {
    if (func.args.length === 0) return '[]';
    return JSON.stringify(
      func.args.map(() => null),
      null,
      2,
    );
  };

  const [argsInput, setArgsInput] = useState(buildDefaultArgs);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only the actual param names — no phantom args
  const sigParams = func.args.map(a => a.name).join(', ');

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let parsedArgs: unknown[] = [];
      if (argsInput.trim() && argsInput.trim() !== '[]') {
        parsedArgs = JSON.parse(argsInput);
        if (!Array.isArray(parsedArgs))
          throw new Error('Arguments must be a valid JSON array.');
      }
      const res = await api.call(prefix, suffix, version, func.name, parsedArgs);
      setResult(JSON.stringify(res, null, 2));
    } catch (err: unknown) {
      setError((err as Error).message ?? 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Row header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors group ${
          isOpen ? 'bg-amber-50' : 'hover:bg-gray-50'
        }`}
      >
        {/* diamond */}
        <span
          className={`shrink-0 transition-colors ${
            isOpen
              ? 'text-amber-500'
              : 'text-emerald-500 group-hover:text-emerald-600'
          }`}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M8 1 L15 8 L8 15 L1 8 Z" />
          </svg>
        </span>

        {/* Signature */}
        <span className="flex-1 font-mono text-[13px] font-medium truncate">
          <span
            className={
              isOpen
                ? 'font-bold text-amber-700'
                : 'text-slate-700 group-hover:text-slate-900'
            }
          >
            {func.name}
          </span>
          {sigParams ? (
            <span className="text-slate-400">
              {' ( '}
              {sigParams}
              {' )'}
            </span>
          ) : (
            <span className="text-slate-400">{' ()'}</span>
          )}
          {func.isAsync && (
            <span className="ml-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              async
            </span>
          )}
        </span>

        <span
          className={`shrink-0 transition-colors ${
            isOpen ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        >
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="px-5 pt-3 pb-5 bg-white border-t border-amber-100/80 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-gray-50 border border-gray-200">
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-blue-500 text-white uppercase tracking-wider">
              POST
            </span>
            <code
              className="flex-1 min-w-0 text-[11px] font-mono text-gray-600 overflow-x-auto whitespace-nowrap"
              title={endpoint}
            >
              {endpoint}
            </code>
            <div className="shrink-0">
              <CopyButton text={endpoint} />
            </div>
          </div>

          {/* Args */}
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Arguments JSON Array
              {func.args.length > 0 && (
                <span className="ml-2 font-mono font-normal normal-case text-gray-400">
                  [ {func.args.map(a => a.name).join(', ')} ]
                </span>
              )}
            </label>
            <textarea
              value={argsInput}
              onChange={e => setArgsInput(e.target.value)}
              placeholder={
                func.args.length > 0
                  ? `e.g. [${func.args.map(() => '...').join(', ')}]`
                  : '[]'
              }
              rows={Math.max(3, func.args.length + 1)}
              className="bg-white border border-gray-200 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-shadow resize-y"
              spellCheck={false}
            />
          </div>

          {/* Execute */}
          <div className="flex justify-end">
            <button
              onClick={() => { void handleRun(); }}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-gray-500 text-white text-xs font-bold hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {loading && <Spinner size={12} />}
              Execute
            </button>
          </div>

          {/* Response */}
          {(result !== null || error !== null) && (
            <div className="mt-3 flex flex-col gap-1.5 animate-in fade-in">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Response
              </label>
              <div
                className={`p-3 font-mono text-xs overflow-x-auto whitespace-pre border ${
                  error
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-900 text-green-400 border-slate-700'
                }`}
              >
                {error ?? result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
