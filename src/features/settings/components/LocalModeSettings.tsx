import { useState } from 'react';
import { ExternalLink, Server } from 'lucide-react';
import { getBaseUrl } from '@/lib/api-client';
import { FaasUrlSettings } from './FaasUrlSettings';

interface LocalModeSettingsProps {
  faasUrl: string;
}

/** Settings for a Launchpad served against a local FaaS, where there is no account. */
export function LocalModeSettings({ faasUrl }: LocalModeSettingsProps) {
  const [activeFaasUrl, setActiveFaasUrl] = useState(faasUrl);

  return (
    <div className="grow flex flex-col items-center justify-start p-4 bg-white animate-in fade-in duration-500">
      <div className="w-full max-w-350 flex flex-col mt-4">
        <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-200">
          <div>
            <h2 className="text-3xl font-medium text-slate-800 tracking-tight">Settings</h2>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Launchpad is connected to the MetaCall FaaS running on this machine.
            </p>
          </div>
        </div>

        <div className="border border-slate-300 bg-white flex flex-col max-w-2xl">
          <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
            <Server size={14} className="text-slate-600" />
            Local Mode
          </div>
          <div className="p-6 flex flex-col gap-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                FaaS URL
              </p>
              <p className="border-b border-slate-300 text-slate-800 py-2.5 text-sm font-mono break-all">
                {activeFaasUrl}
              </p>
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed">
              There is no account in local mode, so profile, password, CLI token and billing
              settings are not available here. They are on the hosted dashboard.
            </p>
            <a
              href="https://dashboard.metacall.io"
              target="_blank"
              rel="noreferrer"
              className="w-full flex justify-between items-center px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider font-bold"
            >
              dashboard.metacall.io
              <ExternalLink size={14} className="text-gray-400" />
            </a>
          </div>
        </div>

        <div className="max-w-2xl mt-8">
          <FaasUrlSettings onChange={() => setActiveFaasUrl(getBaseUrl())} />
        </div>
      </div>
    </div>
  );
}
