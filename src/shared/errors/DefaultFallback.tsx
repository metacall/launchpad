import { RefreshCw } from 'lucide-react';

interface DefaultFallbackProps {
  error: Error;
  reset: () => void;
}

export function DefaultFallback({ error, reset }: DefaultFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-sm p-8 flex flex-col items-center text-center gap-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-600 px-3 py-1 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Unexpected error
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            We hit an issue while rendering this page. Please try again or refresh the app.
          </p>
        </div>

        {/* Error detail (only in dev) */}
        {import.meta.env.DEV && (
          <div className="w-full text-left bg-slate-50 border border-slate-200 p-4 overflow-auto rounded">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Error Details
            </div>
            <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono leading-relaxed">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </div>
        )}

        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
