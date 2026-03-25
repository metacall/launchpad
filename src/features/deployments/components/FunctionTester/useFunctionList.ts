import type { Deployment } from '@/shared/types';
import type { FuncEntry } from './types';

export function useFunctionList(deployment: Deployment): FuncEntry[] {
  return Object.entries(deployment.packages ?? {}).flatMap(([lang, handles]) => {
    if (!Array.isArray(handles)) return [];
    return handles.flatMap(handle => {
      const funcs = handle?.scope?.funcs;
      if (!Array.isArray(funcs)) return [];
      return funcs.map(f => {
        const func = f as {
          name: string;
          async: boolean;
          signature: {
            ret: { type: { name: string } };
            args: { name: string; type: { name: string } }[];
          };
        };
        return {
          name: func.name ?? 'unknown',
          args: (func.signature?.args ?? []).map(a => ({
            name: a?.name ?? 'arg',
            type: a?.type?.name ?? 'any',
          })),
          returnType: func.signature?.ret?.type?.name ?? 'any',
          lang,
          handleName: handle?.name ?? 'unknown',
          isAsync: func.async ?? false,
        };
      });
    });
  });
}

