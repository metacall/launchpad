import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeploymentsPage from '@/features/deployments/pages/DeploymentsPage';
import { useDeployments } from '@/features/deployments/hooks/useDeployments';
import type { Deployment } from '@/shared/types';

function makeDeployment(
  suffix: string,
  status: Deployment['status'],
  language: string,
  prefix = 'app',
): Deployment {
  return {
    suffix,
    prefix,
    version: 'v1',
    status,
    packages: Object.fromEntries([[language, []]]) as unknown as Deployment['packages'],
    ports: [],
  };
}

vi.mock('@/features/deployments/hooks/useDeployments');
vi.mock('@/lib/api-client', () => ({
  api: { deployDelete: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUseDeployments = vi.mocked(useDeployments);
const deployments: Deployment[] = [
  makeDeployment('zeta', 'ready', 'node'),
  makeDeployment('alpha', 'fail', 'py'),
  makeDeployment('mid', 'create', 'ts', 'tools'),
];

function rowNames(): string[] {
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  return rows.slice(1).map(row => within(row).getAllByRole('cell')[0].textContent ?? '');
}

describe('DeploymentsPage filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeployments.mockReturnValue({
      deployments,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <DeploymentsPage />
      </MemoryRouter>,
    );

  it('filters the table by search term, case-insensitively', () => {
    renderPage();
    expect(rowNames()).toEqual(['zeta', 'alpha', 'mid']);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search deployments' }), {
      target: { value: 'ALPHA' },
    });

    expect(rowNames()).toEqual(['alpha']);
    expect(screen.getByText('Showing 1 of 3')).toBeInTheDocument();
  });

  it('filters by status and language independently', () => {
    renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: 'ready' },
    });
    expect(rowNames()).toEqual(['zeta']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by language' }), {
      target: { value: 'ts' },
    });
    expect(rowNames()).toEqual(['mid']);
  });

  it('sorts the table by name', () => {
    renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort deployments' }), {
      target: { value: 'name-desc' },
    });

    expect(rowNames()).toEqual(['zeta', 'mid', 'alpha']);
  });

  it('shows an empty state and restores all rows when filters are cleared', () => {
    renderPage();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search deployments' }), {
      target: { value: 'missing' },
    });

    expect(screen.getByText('No deployments match your filters')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);

    expect(rowNames()).toEqual(['zeta', 'alpha', 'mid']);
    expect(screen.getByText('Showing 3 of 3')).toBeInTheDocument();
  });
});
