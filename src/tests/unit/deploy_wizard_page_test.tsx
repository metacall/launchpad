import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import DeployWizardPage from '@/features/deployments/components/DeployWizard/index';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  api: {
    upload: vi.fn(),
    deploy: vi.fn(),
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

describe('DeployWizardPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReady = undefined;
    mockOnFailed = undefined;
  });

  it('calls toast.success on successful deploy', async () => {
    render(
      <MemoryRouter
        initialEntries={[{ state: { file: new File([''], 'test.zip'), plan: 'Free' } }]}
      >
        <DeployWizardPage />
      </MemoryRouter>,
    );

    if (mockOnReady) {
      mockOnReady({ suffix: 'test-dep' });
    }

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Deployed successfully!');
    });
  });

  it('calls toast.error on failed deploy', async () => {
    render(
      <MemoryRouter
        initialEntries={[{ state: { file: new File([''], 'test.zip'), plan: 'Free' } }]}
      >
        <DeployWizardPage />
      </MemoryRouter>,
    );

    if (mockOnFailed) {
      mockOnFailed('Build crashed');
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Deploy failed: Build crashed');
    });
  });
});
