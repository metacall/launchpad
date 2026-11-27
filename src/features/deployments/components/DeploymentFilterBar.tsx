import { Search, X } from 'lucide-react';
import type { DeploymentFilters } from '../lib/deploymentFilters';
import { hasActiveFilters, statusLabel } from '../lib/deploymentFilters';

const controlClass =
  'min-h-11 border border-slate-300 bg-white px-3 text-sm text-slate-700 ' +
  'outline-none transition-colors focus:border-slate-700 placeholder:text-gray-400';

interface DeploymentFilterBarProps {
  filters: DeploymentFilters;
  statuses: string[];
  languages: string[];
  visibleCount: number;
  totalCount: number;
  onChange: (changes: Partial<DeploymentFilters>) => void;
  onReset: () => void;
}

export function DeploymentFilterBar({
  filters,
  statuses,
  languages,
  visibleCount,
  totalCount,
  onChange,
  onReset,
}: DeploymentFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 border border-slate-300 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 grow sm:min-w-48">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          aria-label="Search deployments"
          placeholder="Search deployments…"
          value={filters.query}
          onChange={event => onChange({ query: event.target.value })}
          className={`${controlClass} w-full pl-9`}
        />
      </div>

      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={event => onChange({ status: event.target.value })}
        className={controlClass}
      >
        <option value="">All statuses</option>
        {statuses.map(status => (
          <option key={status} value={status}>
            {statusLabel(status)}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by language"
        value={filters.language}
        onChange={event => onChange({ language: event.target.value })}
        className={controlClass}
      >
        <option value="">All languages</option>
        {languages.map(language => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort deployments"
        value={filters.sort}
        onChange={event => onChange({ sort: event.target.value as DeploymentFilters['sort'] })}
        className={controlClass}
      >
        <option value="default">Default order</option>
        <option value="name-asc">Name (A–Z)</option>
        <option value="name-desc">Name (Z–A)</option>
        <option value="status">Status</option>
      </select>

      <span aria-live="polite" className="text-xs font-semibold text-gray-500 sm:ml-auto">
        Showing {visibleCount} of {totalCount}
      </span>

      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onReset}
          className="flex min-h-11 items-center justify-center gap-1.5 border border-slate-300 px-3 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:border-slate-700 hover:bg-slate-700 hover:text-white"
        >
          <X size={13} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
