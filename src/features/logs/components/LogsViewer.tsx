import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Copy, Check, ArrowDown, WrapText, AlignLeft } from 'lucide-react';
import type { LogEntry } from '@/shared/types';

interface LogsViewerProps {
  logs: LogEntry[];
  className?: string;
  error?: string | null;
}

type LevelFilter = LogEntry['level'] | 'all';

// Level configuration
const LEVEL_BADGE: Record<
  LogEntry['level'],
  { label: string; cls: string; textCls: string; filterCls: string }
> = {
  info: {
    label: 'INFO',
    cls: 'text-cyan-200 border-cyan-500/20',
    textCls: 'text-slate-300',
    filterCls: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  },
  success: {
    label: 'OK',
    cls: 'text-emerald-200 border-emerald-500/20',
    textCls: 'text-slate-300',
    filterCls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  warn: {
    label: 'WARN',
    cls: 'text-amber-200 border-amber-500/20',
    textCls: 'text-slate-300',
    filterCls: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  error: {
    label: 'ERR',
    cls: 'text-red-200 border-red-500/20',
    textCls: 'text-slate-300',
    filterCls: 'border-red-500/40 text-red-400 bg-red-500/15',
  },
  http: {
    label: 'HTTP',
    cls: 'text-violet-200 border-violet-500/20',
    textCls: 'text-slate-300',
    filterCls: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
  },
};

const ALL_LEVELS: LogEntry['level'][] = ['info', 'success', 'warn', 'error', 'http'];

export function LogsViewer({ logs, className, error }: LogsViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [copied, setCopied] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 180);
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 180) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const visible = logs.filter(e => {
    if (levelFilter !== 'all' && e.level !== levelFilter) return false;
    return true;
  });

  // Level counts
  const counts = logs.reduce<Record<string, number>>((acc, e) => {
    acc[e.level] = (acc[e.level] ?? 0) + 1;
    return acc;
  }, {});

  const handleCopy = () => {
    const text = visible
      .map(e => `${e.timestamp || '--:--:--'} [${e.level.toUpperCase()}] ${e.message}`)
      .join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Empty state
  if (logs.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center gap-3 bg-slate-950 text-gray-300 h-full w-full', className)}>
        {error ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 border border-red-800/40 rounded font-mono text-sm text-red-400">
              <span className="font-bold uppercase tracking-wider text-[9px] border border-red-700 px-1.5 py-0.5 rounded">ERR</span>
              <span>{error}</span>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">
              Retrying automatically…
            </div>
          </>
        ) : (
          <>
            <div className="font-mono text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-5 bg-slate-600 animate-pulse" />
              <span className="text-slate-500">Waiting for log output…</span>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest opacity-30 mt-1">
              Logs will appear here once available
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col bg-slate-800 w-full h-full rounded', className)}>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-700">

        <div className="w-px h-3.5 bg-slate-800 mx-1 shrink-0" />

        {/* Level filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          <button
            onClick={() => setLevelFilter('all')}
            className={clsx(
              'shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded transition-colors',
              levelFilter === 'all'
                ? 'border-slate-500 text-slate-200 bg-slate-700/60'
                : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400',
            )}
          >
            All <span className="opacity-60 ml-0.5">{logs.length}</span>
          </button>
          {ALL_LEVELS.filter(l => counts[l]).map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(prev => prev === l ? 'all' : l)}
              className={clsx(
                'shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded transition-colors',
                levelFilter === l
                  ? LEVEL_BADGE[l].filterCls
                  : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400',
              )}
            >
              {LEVEL_BADGE[l].label} <span className="opacity-60 ml-0.5">{counts[l]}</span>
            </button>
          ))}
        </div>

        {/* Wrap toggle */}
        <button
          onClick={() => setWrap(w => !w)}
          title={wrap ? 'Disable line wrap' : 'Enable line wrap'}
          className={clsx(
            'shrink-0 flex items-center justify-center w-7 h-7 border rounded transition-colors',
            wrap
              ? 'border-slate-500 text-slate-200 bg-slate-700/60'
              : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400',
          )}
        >
          {wrap ? <WrapText size={12} /> : <AlignLeft size={12} />}
        </button>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title="Copy visible logs"
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-700 hover:border-slate-500 hover:text-slate-300 rounded transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent relative"
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600 font-mono text-[12px]">
            <span>No logs match the selected filter.</span>
            <button onClick={() => setLevelFilter('all')} className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
              Show all logs
            </button>
          </div>
        ) : (
          <div className="font-mono text-[16px] leading-6">
            {visible.map((entry, i) => {
              const badge = LEVEL_BADGE[entry.level];
              return (
                <div
                  key={i}
                  className={clsx(
                    'group flex items-start gap-0 transition-colors hover:bg-slate-700/60',
                    'bg-transparent'
                  )}
                >
                  {/* Line number */}
                  <span className="shrink-0 w-12 text-right pr-3 text-slate-500 select-none text-[11px] leading-6 group-hover:text-slate-500 transition-colors border-r border-slate-800">
                    {i + 1}
                  </span>
                  {/* Timestamp */}
                  <span className="shrink-0 w-20 px-2 text-slate-500 select-none truncate leading-6 text-[11px]">
                    {entry.timestamp || '—'}
                  </span>
                  {/* Level badge */}
                  <span className={clsx('shrink-0 w-12 mr-2 px-1 border text-center text-[10px] font-bold uppercase tracking-wider leading-[1.4] rounded mt-[3px]', badge.cls)}>
                    {badge.label}
                  </span>
                  {/* Message */}
                  <span className={clsx('flex-1 leading-6 pr-3', badge.textCls, {
                    'break-all whitespace-pre-wrap': wrap,
                    'truncate': !wrap,
                  })}>
                    {entry.message}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-600 text-slate-300 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-700 hover:text-white rounded shadow-lg transition-all"
          >
            <ArrowDown size={12} />
            Latest
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-1 bg-slate-900 border-t border-slate-600 font-mono text-[10px]">
        <span className="text-slate-500">
          <span className="text-slate-300 font-bold">{visible.length}</span>
          <span className="opacity-50">/{logs.length}</span>
          <span className="ml-1 opacity-50">lines</span>
        </span>
        <div className="w-px h-3 bg-slate-800" />
        {(counts['error'] ?? 0) > 0 && (
          <span className="text-red-400 font-bold">{counts['error']} error{counts['error'] !== 1 ? 's' : ''}</span>
        )}
        {(counts['warn'] ?? 0) > 0 && (
          <span className="text-amber-400 font-bold">{counts['warn']} warning{counts['warn'] !== 1 ? 's' : ''}</span>
        )}
        {(counts['error'] ?? 0) === 0 && (counts['warn'] ?? 0) === 0 && (
          <span className="text-emerald-500/70">Clean</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {ALL_LEVELS.filter(l => counts[l]).map(l => (
            <span key={l} className={clsx('opacity-50', LEVEL_BADGE[l].cls.split(' ')[0])}>
              {LEVEL_BADGE[l].label} {counts[l]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
