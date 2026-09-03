import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeploymentsPage from '@/features/deployments/pages/DeploymentsPage';
import { MemoryRouter } from 'react-router-dom';
import { useDeployments } from '@/features/deployments/hooks/useDeployments';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/features/deployments/hooks/useDeployments');
vi.mock('@/lib/api-client', () => ({
  api: {
    deployDelete: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseDeployments = vi.mocked(useDeployments);
const mockApiDelete = vi.mocked(api.deployDelete);

describe('DeploymentsPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeployments.mockReturnValue({
      deployments: [
        {
          suffix: 'test-dep',
          prefix: 'test-prefix',
          version: 'v1',
          status: 'ready',
          packages: {},
        } as never,
      ],
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

  it('calls toast.success on successful deployment deletion', async () => {
    mockApiDelete.mockResolvedValueOnce(undefined);
    renderPage();

    // Trigger delete flow
    // Find the trash button in DeploymentTable
    const deleteBtn = screen.getByTitle('Delete Deployment');
    fireEvent.click(deleteBtn);

    // Now DeleteModal should be visible. Click the confirm button.
    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('test-prefix', 'test-dep', 'v1');
      expect(toast.success).toHaveBeenCalledWith('Deployment deleted successfully!');
    });
  });

  it('calls toast.error on failed deployment deletion', async () => {
    mockApiDelete.mockRejectedValueOnce(new Error('Network error'));
    renderPage();

    const deleteBtn = screen.getByTitle('Delete Deployment');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Delete failed, check server connection.');
    });
  });
});
