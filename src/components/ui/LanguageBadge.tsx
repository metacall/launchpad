import { clsx } from 'clsx';
import type { LanguageId } from '@/types';

interface LanguageBadgeProps {
  language: LanguageId | string;
}

const LANG_CONFIG: Partial<
  Record<LanguageId | string, { label: string; bg: string; text: string }>
> = {
  node: { label: 'Node.js', bg: 'bg-slate-100', text: 'text-slate-600' },
  ts: { label: 'TypeScript', bg: 'bg-slate-100', text: 'text-slate-600' },
  py: { label: 'Python', bg: 'bg-slate-100', text: 'text-slate-600' },
  rb: { label: 'Ruby', bg: 'bg-slate-100', text: 'text-slate-600' },
  cs: { label: 'C#', bg: 'bg-slate-100', text: 'text-slate-600' },
  cob: { label: 'COBOL', bg: 'bg-slate-100', text: 'text-slate-600' },
  file: { label: 'File', bg: 'bg-slate-100', text: 'text-slate-600' },
  rpc: { label: 'RPC', bg: 'bg-slate-100', text: 'text-slate-600' },
};

export function LanguageBadge({ language }: LanguageBadgeProps) {
  const config = LANG_CONFIG[language] ?? {
    label: language,
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
      )}
    >
      {config.label}
    </span>
  );
}
