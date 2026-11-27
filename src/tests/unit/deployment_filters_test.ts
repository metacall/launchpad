import { describe, it, expect } from 'vitest';
import type { Deployment, LanguageId } from '@/shared/types';
import {
  DEFAULT_DEPLOYMENT_FILTERS,
  getDeploymentLanguages,
  getDeploymentStatuses,
  hasActiveFilters,
  matchesQuery,
  selectDeployments,
  statusLabel,
} from '@/features/deployments/lib/deploymentFilters';

function deployment(
  suffix: string,
  status: Deployment['status'],
  languages: LanguageId[] = [],
  prefix = 'app',
  version = 'v1',
): Deployment {
  return {
    suffix,
    prefix,
    version,
    status,
    packages: Object.fromEntries(
      languages.map(language => [language, []]),
    ) as unknown as Deployment['packages'],
    ports: [],
  };
}

const deployments: Deployment[] = [
  deployment('zeta', 'ready', ['node']),
  deployment('alpha', 'fail', ['py', 'node']),
  deployment('mid', 'create', ['ts'], 'other'),
];

describe('deployment filter helpers', () => {
  describe('matchesQuery', () => {
    it('matches names, prefixes and versions case-insensitively', () => {
      expect(matchesQuery(deployments[0], 'ZET')).toBe(true);
      expect(matchesQuery(deployments[2], 'OTHER')).toBe(true);
      expect(matchesQuery(deployments[0], 'v1')).toBe(true);
      expect(matchesQuery(deployments[0], 'nothing')).toBe(false);
    });

    it('ignores surrounding whitespace and treats an empty query as a match', () => {
      expect(matchesQuery(deployments[0], '   ')).toBe(true);
      expect(matchesQuery(deployments[0], '  zeta  ')).toBe(true);
    });
  });

  it('extracts unique languages in alphabetical order', () => {
    expect(getDeploymentLanguages(deployments)).toEqual(['node', 'py', 'ts']);
    expect(getDeploymentLanguages([])).toEqual([]);
  });

  it('extracts unique statuses in build, ready, stopped, failure order', () => {
    expect(getDeploymentStatuses(deployments)).toEqual(['create', 'ready', 'fail']);
    expect(getDeploymentStatuses([deployment('x', 'fail'), deployment('y', 'ready')])).toEqual([
      'ready',
      'fail',
    ]);
  });

  it('maps raw FaaS statuses to friendly labels', () => {
    expect(statusLabel('create')).toBe('Building');
    expect(statusLabel('fail')).toBe('Failed');
    expect(statusLabel('ready')).toBe('Ready');
    expect(statusLabel('unknown')).toBe('unknown');
  });

  it('detects whether any filter or a sort is active', () => {
    expect(hasActiveFilters(DEFAULT_DEPLOYMENT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_DEPLOYMENT_FILTERS, query: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_DEPLOYMENT_FILTERS, query: 'zeta' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_DEPLOYMENT_FILTERS, status: 'ready' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_DEPLOYMENT_FILTERS, language: 'node' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_DEPLOYMENT_FILTERS, sort: 'name-asc' })).toBe(true);
  });

  it('preserves the incoming order by default and does not mutate the input', () => {
    const result = selectDeployments(deployments, DEFAULT_DEPLOYMENT_FILTERS);
    expect(result.map(item => item.suffix)).toEqual(['zeta', 'alpha', 'mid']);
    expect(result).not.toBe(deployments);
    expect(deployments.map(item => item.suffix)).toEqual(['zeta', 'alpha', 'mid']);
  });

  it('combines search, status and language filters', () => {
    const result = selectDeployments(deployments, {
      ...DEFAULT_DEPLOYMENT_FILTERS,
      query: 'APP',
      status: 'fail',
      language: 'py',
    });
    expect(result.map(item => item.suffix)).toEqual(['alpha']);
  });

  it('sorts by name in both directions', () => {
    expect(
      selectDeployments(deployments, { ...DEFAULT_DEPLOYMENT_FILTERS, sort: 'name-asc' }).map(
        item => item.suffix,
      ),
    ).toEqual(['alpha', 'mid', 'zeta']);
    expect(
      selectDeployments(deployments, { ...DEFAULT_DEPLOYMENT_FILTERS, sort: 'name-desc' }).map(
        item => item.suffix,
      ),
    ).toEqual(['zeta', 'mid', 'alpha']);
  });

  it('sorts by status and uses the name to break ties', () => {
    const tied = [
      deployment('b', 'ready'),
      deployment('a', 'ready'),
      deployment('z', 'create'),
      deployment('y', 'fail'),
    ];
    expect(
      selectDeployments(tied, { ...DEFAULT_DEPLOYMENT_FILTERS, sort: 'status' }).map(
        item => item.suffix,
      ),
    ).toEqual(['z', 'a', 'b', 'y']);
  });
});
