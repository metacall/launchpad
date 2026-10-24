import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('@/features/deployments/components/FunctionTester', () => ({
  FunctionTester: () => <div>Function tester</div>,
}));

vi.mock('@/features/logs/hooks/useLogs', () => ({
  useLogs: vi.fn(() => ({ logs: [], loading: false, error: null, refetch: vi.fn() })),
}));

const mockInspect = vi.mocked(api.inspectByName);
const mockDelete = vi.mocked(api.deployDelete);
const originalMatchMedia = window.matchMedia;

describe('DeploymentFunctionPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
  });

  const renderPage = (viewportWidth = 1024) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: viewportWidth < 768,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    return render(
      <MemoryRouter initialEntries={['/deployments/test-suffix']}>
        <Routes>
          <Route path="/deployments/:id" element={<DeploymentFunctionPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  const deploymentResponse = {
    suffix: 'test-suffix',
    prefix: 'test-prefix',
    version: 'v1',
    status: 'ready',
    packages: {},
    ports: [8080],
  };

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

  it('shows the inspection API environment-variable limitation in Config', async () => {
    mockInspect.mockResolvedValueOnce(deploymentResponse as never);
    renderPage(375);

    fireEvent.click(await screen.findByRole('button', { name: 'Config' }));

    expect(screen.getByText('8080')).toBeInTheDocument();
    expect(screen.getByText('Environment variables are unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The deployment inspection response does not include environment variables.',
      ),
    ).toBeInTheDocument();
  });

  it.each([320, 375, 480])(
    'lets users at %ipx reach each of the five detail sections without duplicate panels',
    async viewportWidth => {
      mockInspect.mockResolvedValueOnce(deploymentResponse as never);
      renderPage(viewportWidth);

      expect(await screen.findByText('Function tester')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Overview' })).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: 'Endpoints' }));
      expect(screen.getByText('Base HTTP URL')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Endpoints' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.queryByText('Function tester')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Packages' }));
      expect(screen.getByText('No packages deployed')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Config' }));
      expect(screen.getByText('Exposed Ports')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Logs' }));
      expect(screen.getByText('Waiting for log output…')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
      expect(screen.getByText('Function tester')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Deployment details' })).toHaveClass(
        'overflow-x-auto',
      );
    },
  );

  it.each([768, 1024])('keeps the desktop sidebar available at %ipx', async viewportWidth => {
    mockInspect.mockResolvedValueOnce(deploymentResponse as never);
    renderPage(viewportWidth);

    expect(await screen.findByText('Function tester')).toBeInTheDocument();
    expect(screen.getByText('Base HTTP URL')).toBeInTheDocument();
    expect(screen.getByText('No packages deployed')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Deployment details' }),
    ).not.toBeInTheDocument();
  });
});
