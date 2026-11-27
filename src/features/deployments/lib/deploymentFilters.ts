import type { Deployment } from '@/shared/types';

export type DeploymentSortKey = 'default' | 'name-asc' | 'name-desc' | 'status';

export interface DeploymentFilters {
  query: string;
  status: string;
  language: string;
  sort: DeploymentSortKey;
}

export const DEFAULT_DEPLOYMENT_FILTERS: DeploymentFilters = {
  query: '',
  status: '',
  language: '',
  sort: 'default',
};

/** Friendly labels for the status values returned by FaaS. */
const STATUS_LABELS: Record<string, string> = {
  create: 'Building',
  building: 'Building',
  ready: 'Ready',
  stopped: 'Stopped',
  fail: 'Failed',
  failed: 'Failed',
  error: 'Failed',
};

/** Order used by the "status" sort: in progress, healthy, stopped, then failures. */
const STATUS_ORDER: Record<string, number> = {
  create: 0,
  building: 0,
  ready: 1,
  stopped: 2,
  fail: 3,
  failed: 3,
  error: 3,
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status.toLowerCase()] ?? status;
}

function statusRank(status: string): number {
  return STATUS_ORDER[status.toLowerCase()] ?? 4;
}

function compareByName(a: Deployment, b: Deployment): number {
  return a.suffix.localeCompare(b.suffix);
}

/** Match the search term against the name, prefix and version of a deployment. */
export function matchesQuery(deployment: Deployment, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [deployment.suffix, deployment.prefix, deployment.version].some(value =>
    value?.toLowerCase().includes(needle),
  );
}

/** All languages present in the list, sorted alphabetically. */
export function getDeploymentLanguages(deployments: Deployment[]): string[] {
  const languages = new Set<string>();
  for (const deployment of deployments) {
    for (const language of Object.keys(deployment.packages ?? {})) {
      languages.add(language);
    }
  }
  return [...languages].sort((a, b) => a.localeCompare(b));
}

/** All statuses present in the list, in the same order used by the status sort. */
export function getDeploymentStatuses(deployments: Deployment[]): string[] {
  const statuses = new Set<string>();
  for (const deployment of deployments) {
    if (deployment.status) statuses.add(deployment.status);
  }
  return [...statuses].sort((a, b) => statusRank(a) - statusRank(b) || a.localeCompare(b));
}

export function hasActiveFilters(filters: DeploymentFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== '' ||
    filters.language !== '' ||
    filters.sort !== DEFAULT_DEPLOYMENT_FILTERS.sort
  );
}

/** Apply search, status/language filters and sorting without mutating the input. */
export function selectDeployments(
  deployments: Deployment[],
  filters: DeploymentFilters,
): Deployment[] {
  const filtered = deployments.filter(deployment => {
    const hasLanguage =
      filters.language === '' ||
      Object.prototype.hasOwnProperty.call(deployment.packages ?? {}, filters.language);

    return (
      matchesQuery(deployment, filters.query) &&
      (filters.status === '' || deployment.status === filters.status) &&
      hasLanguage
    );
  });

  if (filters.sort === 'default') return filtered;

  const sorted = [...filtered];
  switch (filters.sort) {
    case 'name-asc':
      sorted.sort(compareByName);
      break;
    case 'name-desc':
      sorted.sort((a, b) => -compareByName(a, b));
      break;
    case 'status':
      sorted.sort((a, b) => statusRank(a.status) - statusRank(b.status) || compareByName(a, b));
      break;
  }
  return sorted;
}
