import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import DeployRepositoryPage from '@/features/deployments/pages/DeployRepositoryPage';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  api: {
    add: vi.fn(),
    deploy: vi.fn(),
    branchList: vi.fn().mockResolvedValue(['main']),
    listSubscriptions: vi.fn().mockResolvedValue({}),
    inspect: vi.fn().mockResolvedValue([]),
  },
}));

let mockOnReady: ((d: unknown) => void) | undefined;
let mockOnFailed: ((m: string) => void) | undefined;

vi.mock('@/features/deployments/hooks/useDeploymentMonitor', () => ({
  useDeploymentMonitor: ({
    onReady,
    onFailed,
  }: {
    onReady?: (d: unknown) => void;
    onFailed?: (m: string) => void;
  }) => {
    mockOnReady = onReady;
    mockOnFailed = onFailed;
    return { status: 'create' };
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DeployRepositoryPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReady = undefined;
    mockOnFailed = undefined;
  });

  it('calls toast.success on successful deploy', async () => {
    render(
      <MemoryRouter>
        <DeployRepositoryPage />
      </MemoryRouter>,
    );

    // Simulate the monitor calling onReady
    if (mockOnReady) {
      mockOnReady({ suffix: 'test-dep' });
    }

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Repository deployed successfully!');
    });
  });

  it('calls toast.error on failed deploy', async () => {
    render(
      <MemoryRouter>
        <DeployRepositoryPage />
      </MemoryRouter>,
    );

    if (mockOnFailed) {
      mockOnFailed('Build failed');
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Deploy failed: Build failed');
    });
  });
});
