import { useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { env } from '@/app/config/env';
import type { Deployment } from '@/shared/types';
import { useFunctionList } from './useFunctionList';
import { FunctionRow } from './FunctionRow';

interface FunctionTesterProps {
  deployment: Deployment;
  onScrollProgressChange?: (progress: number) => void;
}
// The FunctionTester component displays a list of exported functions
export function FunctionTester({ deployment, onScrollProgressChange }: FunctionTesterProps) {
  const [openFunc, setOpenFunc] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const baseUrl = env.FAAS_URL;
  const allFuncs = useFunctionList(deployment);

  const handleScroll = () => {
    const node = listRef.current;
    if (!node) return;

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      onScrollProgressChange?.(0);
      return;
    }

    onScrollProgressChange?.((node.scrollTop / maxScroll) * 100);
  };
  // when there is no function exported from the deployment, we show this empty state to the user
  if (allFuncs.length === 0) {
    return (
      <div className="bg-slate-900 flex flex-col items-center justify-center h-full p-12 text-center">
        <p className="text-sm font-semibold text-slate-600">No exported functions</p>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          This deployment does not expose any callable functions yet.
          Deploy a package that exports functions to test them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
            Exported Functions
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono font-medium bg-slate-100 px-2 py-0.5 rounded">
          {allFuncs.length}
        </span>
      </div>

      {/* Accordion list */}
      <div ref={listRef} onScroll={handleScroll} className="overflow-y-auto flex-1">
        {allFuncs.map(func => {
          const funcKey = `${func.lang}::${func.handleName}::${func.name}`;
          const endpoint = `${baseUrl}/${deployment.prefix}/${deployment.suffix}/${deployment.version}/call/${func.name}`;
          const isOpen = openFunc === funcKey;
          return (
            <FunctionRow
              key={funcKey}
              func={func}
              endpoint={endpoint}
              isOpen={isOpen}
              onToggle={() => setOpenFunc(isOpen ? null : funcKey)}
              prefix={deployment.prefix}
              suffix={deployment.suffix}
              version={deployment.version}
            />
          );
        })}
      </div>
    </div>
  );
}
