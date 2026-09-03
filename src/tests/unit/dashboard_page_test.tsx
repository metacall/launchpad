import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import { MemoryRouter } from 'react-router-dom';
import { useDeployments } from '@/features/deployments/hooks/useDeployments';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/features/deployments/hooks/useDeployments');
vi.mock('@/lib/api-client', () => ({
  api: {
    deployDelete: vi.fn(),
    listSubscriptions: vi.fn().mockResolvedValue({}),
    inspect: vi.fn().mockResolvedValue([]),
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

describe('DashboardPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeployments.mockReturnValue({
      deployments: [
        {
          suffix: 'dashboard-dep',
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
        <DashboardPage />
      </MemoryRouter>,
    );

  it('calls toast.success on successful deployment deletion', async () => {
    mockApiDelete.mockResolvedValueOnce(undefined);
    renderPage();

    // Trigger delete flow
    const deleteBtn = screen.getByTitle('Delete Deployment');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('test-prefix', 'dashboard-dep', 'v1');
      expect(toast.success).toHaveBeenCalledWith('Deployment deleted successfully!');
    });
  });

  it('calls toast.error on failed deployment deletion', async () => {
    mockApiDelete.mockRejectedValueOnce(new Error('Dashboard network error'));
    renderPage();

    const deleteBtn = screen.getByTitle('Delete Deployment');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to delete deployment: Dashboard network error',
      );
    });
  });
});
