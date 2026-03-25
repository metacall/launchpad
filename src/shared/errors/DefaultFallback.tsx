import { RefreshCw, AlertTriangle } from 'lucide-react';

interface DefaultFallbackProps {
  error: Error;
  reset: () => void;
}

export function DefaultFallback({ error, reset }: DefaultFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200 shadow-sm p-8 max-w-lg w-full text-center flex flex-col items-center gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-400" />
        
        <div className="p-3 bg-red-50 rounded-full mt-2">
          <AlertTriangle size={24} className="text-red-500" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Something went wrong</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred and has been logged. You can try reloading this section or refreshing the page.
          </p>
        </div>

        {/* Error detail (only in dev) */}
        {import.meta.env.DEV && (
          <div className="w-full text-left bg-slate-50 border border-slate-200 p-4 overflow-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Error Details</div>
            <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono leading-relaxed">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </div>
        )}

        <button
          onClick={reset}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
