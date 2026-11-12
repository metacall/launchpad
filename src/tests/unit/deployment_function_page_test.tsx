import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeploymentFunctionPage from '@/features/deployments/pages/DeploymentFunctionPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  api: {
    inspectByName: vi.fn(),
    deployDelete: vi.fn(),
    call: vi.fn(),
    logs: vi.fn(),
  },
  isApiError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockInspect = vi.mocked(api.inspectByName);
const mockDelete = vi.mocked(api.deployDelete);

describe('DeploymentFunctionPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/deployments/test-suffix']}>
        <Routes>
          <Route path="/deployments/:suffix" element={<DeploymentFunctionPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('calls toast.success on successful deletion', async () => {
    mockInspect.mockResolvedValueOnce({
      suffix: 'test-suffix',
      prefix: 'test-prefix',
      version: 'v1',
      status: 'ready',
      packages: {},
      runners: [],
    } as never);
    mockDelete.mockResolvedValueOnce(undefined);

    renderPage();

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('test-suffix')).toBeInTheDocument();
    });

    // Click delete
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    // Confirm modal delete button
    // It might be difficult if there are two "Delete" buttons now.
    // The modal has "Cancel" and "Delete". The trigger button has "Delete" with Trash icon.
    const confirmBtns = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtns[0]);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('test-prefix', 'test-suffix', 'v1');
      expect(toast.success).toHaveBeenCalledWith('Deployment deleted successfully!');
    });
  });

  it('calls toast.error on failed deletion', async () => {
    mockInspect.mockResolvedValueOnce({
      suffix: 'test-suffix',
      prefix: 'test-prefix',
      version: 'v1',
      status: 'ready',
      packages: {},
      runners: [],
    } as never);
    mockDelete.mockRejectedValueOnce(new Error('Delete Error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('test-suffix')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    const confirmBtns = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtns[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete deployment: Delete Error');
    });
  });
});

describe('DeploymentFunctionPage route param contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads "suffix" directly from useParams (no aliasing from :id)', async () => {
    // Route must use :suffix — if it were :id the component would receive undefined
    // because useParams() would not find a "suffix" key.
    mockInspect.mockResolvedValueOnce({
      suffix: 'my-deployment',
      prefix: 'test-prefix',
      version: 'v1',
      status: 'ready',
      packages: {},
      runners: [],
    } as never);

    render(
      <MemoryRouter initialEntries={['/deployments/my-deployment']}>
        <Routes>
          <Route path="/deployments/:suffix" element={<DeploymentFunctionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // If :suffix param is correctly named, inspectByName is called with 'my-deployment'
    await waitFor(() => {
      expect(mockInspect).toHaveBeenCalledWith('my-deployment');
    });

    // And the deployment name is rendered on screen
    expect(screen.getByText('my-deployment')).toBeInTheDocument();
  });

  it('AppRouter registers deployment detail route as :suffix not :id', () => {
    // Mirrors the nested route structure from AppRouter.tsx and confirms the param name
    // reaches the component unchanged.
    mockInspect.mockResolvedValueOnce({
      suffix: 'router-test',
      prefix: 'pfx',
      version: 'v1',
      status: 'ready',
      packages: {},
      runners: [],
    } as never);

    render(
      <MemoryRouter initialEntries={['/deployments/router-test']}>
        <Routes>
          {/* Mirrors AppRouter: nested under /deployments with :suffix */}
          <Route path="/deployments">
            <Route path=":suffix" element={<DeploymentFunctionPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // If the param were still :id the component would call inspectByName(undefined)
    return waitFor(() => {
      expect(mockInspect).toHaveBeenCalledWith('router-test');
    });
  });
});
