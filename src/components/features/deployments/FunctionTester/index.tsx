import { useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { env } from '@/env';
import type { Deployment } from '@/types';
import { useFunctionList } from './useFunctionList';
import { FunctionRow } from './FunctionRow';

interface FunctionTesterProps {
  deployment: Deployment;
  onScrollProgressChange?: (progress: number) => void;
}

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

  if (allFuncs.length === 0) {
    return (
      <div className="bg-white flex flex-col items-center justify-center h-full p-12 text-center">
        <Layers size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-semibold text-gray-500">No exported functions found</p>
        <p className="text-xs text-gray-400 mt-1">
          Deploy a package that exports functions to test them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between sticky top-0 z-10">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
          Exported Functions
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          {allFuncs.length} function{allFuncs.length !== 1 ? 's' : ''}
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
