import type { Deployment } from '@/shared/types';
import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { LanguageBadge } from '@/shared/ui/LanguageBadge';
import { CopyButton } from '@/shared/ui/CopyButton';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { env } from '@/app/config/env';

interface DeploymentTableProps {
  deployments: Deployment[];
  onDelete?: (suffix: string) => void;
  loadingStartedAtBySuffix?: Record<string, string>;
}

export function DeploymentTable({
  deployments,
  onDelete,
  loadingStartedAtBySuffix = {},
}: DeploymentTableProps) {
  const navigate = useNavigate();


  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            <th className="py-3 px-4 font-bold">Name</th>
            <th className="py-3 px-4 font-bold">Language</th>
            <th className="py-3 px-4 font-bold">Status</th>
            {/* i dont want to show the endpoint int he small screem  */}
            <th className="py-3 px-4 font-bold hidden sm:table-cell">Endpoint</th>
            <th className="py-3 px-4 font-bold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 hover:bg-white bg-white">
          {deployments.map(dep => {
            const baseUrl = env.FAAS_URL.replace(/\/+$/, '');
            const endpoint = `${baseUrl}/${dep.prefix}/${dep.suffix}/v1/call`;
            const languages = Object.keys(dep.packages ?? {});
            const status = dep.status as Parameters<typeof ProgressBar>[0]['status'];
            const isProcessing = status === 'create' || status === 'building';

            return (
              <tr
                key={dep.suffix}
                className="group hover:bg-white/15 border border-transparent  cursor-pointer"
                onClick={() => {
                  navigate(`/deployments/${dep.suffix}`);
                }}
              >
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-600 text-sm group-hover:text-gray-600 transition-colors">
                    {dep.suffix}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {languages.length > 0 ? (
                      languages.map(lang => <LanguageBadge key={lang} language={lang} />)
                    ) : (
                      <span className="text-xs text-gray-500 italic">Unknown</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="min-w-28">
                    <StatusBadge status={status} />
                    {isProcessing && (
                      <div className="mt-1.5 max-w-24">
                        <ProgressBar
                          status={status}
                          createdAt={loadingStartedAtBySuffix[dep.suffix]}
                          size="xs"
                          showLabel
                          showValue
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <code className="max-w-45 sm:max-w-60 truncate text-[11px] text-gray-500 hover:text-gray-600 font-mono border border-gray-100 px-1.5 py-0.5 shadow-inner">
                      {endpoint}
                    </code>
                    <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                      <CopyButton text={endpoint} />
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/deployments/${dep.suffix}`);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent"
                      title="View Details"
                    >
                      <ExternalLink size={14} />
                    </button>
                    {onDelete && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(dep.suffix);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent"
                        title="Delete Deployment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
