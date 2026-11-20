import { useState, type FormEvent } from 'react';
import { Server } from 'lucide-react';
import { getRuntimeConfig, parseFaasUrl, RUNTIME_CONFIG_PATH } from '@/app/config/runtime';
import { LS_FAAS_URL_KEY } from '@/shared/constants';

/** Stores the FaaS URL override that getBaseUrl() and env.FAAS_URL read from localStorage. */
export function FaasUrlSettings() {
  const [url, setUrl] = useState(() => localStorage.getItem(LS_FAAS_URL_KEY) ?? '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const runtimeUrl = getRuntimeConfig().faasUrl;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseFaasUrl(url);
    if (!parsed) {
      setFeedback({ type: 'error', text: 'Enter a valid http or https URL.' });
      return;
    }
    localStorage.setItem(LS_FAAS_URL_KEY, parsed);
    setUrl(parsed);
    setFeedback({ type: 'success', text: 'FaaS URL saved.' });
    // Reload so cached data and clients from the old host are dropped
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem(LS_FAAS_URL_KEY);
    setUrl('');
    setFeedback({ type: 'success', text: 'FaaS URL reset.' });
    window.location.reload();
  };

  return (
    <div className="border border-slate-300 bg-white flex flex-col">
      <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
        <Server size={14} className="text-slate-600" />
        FaaS Server
      </div>
      <form onSubmit={handleSave} noValidate className="p-6 grow flex flex-col gap-6">
        <div>
          <label
            htmlFor="faas-url"
            className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5"
          >
            FaaS URL
          </label>
          <input
            id="faas-url"
            type="url"
            placeholder="http://localhost:9000"
            value={runtimeUrl ?? url}
            disabled={!!runtimeUrl}
            onChange={e => setUrl(e.target.value)}
            className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none font-mono focus:border-slate-800 transition-colors placeholder:text-gray-300 disabled:text-gray-400"
          />
          <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
            {runtimeUrl
              ? `The FaaS URL is managed by the Launchpad runtime config (${RUNTIME_CONFIG_PATH}), which sets it to ${runtimeUrl}.`
              : 'Saved in this browser. The runtime config faasUrl takes precedence when set.'}
          </p>
          {feedback && (
            <p
              className={`text-[11px] mt-2 font-medium ${
                feedback.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {feedback.text}
            </p>
          )}
        </div>
        <div className="flex justify-start gap-3">
          <button
            type="submit"
            disabled={!!runtimeUrl}
            className="min-h-11 text-slate-600 border border-slate-300 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-gray-700 hover:text-white transition-colors hover:border-slate-800 hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Save URL
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!!runtimeUrl}
            className="min-h-11 text-slate-600 border border-slate-300 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-gray-700 hover:text-white transition-colors hover:border-slate-800 hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
