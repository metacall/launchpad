import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act, screen } from '@testing-library/react';
import DeployWizardPage from '@/features/deployments/components/DeployWizard/index';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { api } from '@/lib/api-client';

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

/**
 * The wizard parses the uploaded file with JSZip on mount. Handing it an empty
 * `File` makes that parse reject, and the component's catch block then logs via
 * console.error from a promise that settles *after* the test body returns.
 * Vitest tries to forward that late log over an RPC channel that is already
 * closing, which surfaces as:
 *   EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending
 * Build a real (tiny) zip so the parse resolves and nothing logs late.
 */
async function makeZipFile(): Promise<File> {
  const zip = new JSZip();
  zip.file('index.js', 'module.exports = () => {};');
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'test.zip', { type: 'application/zip' });
}

describe('DeployWizardPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReady = undefined;
    mockOnFailed = undefined;
  });

  it('calls toast.success on successful deploy', async () => {
    const file = await makeZipFile();

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const onReady = mockOnReady;
    if (onReady) {
      await act(async () => {
        onReady({ suffix: 'test-dep' });
      });
    }

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Deployed successfully!');
    });
  });

  it('calls toast.error on failed deploy', async () => {
    const file = await makeZipFile();

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const onFailed = mockOnFailed;
    if (onFailed) {
      await act(async () => {
        onFailed('Build crashed');
      });
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Deploy failed: Build crashed');
    });
  });

  it('displays slot occupied warning when plan slot is already in use', async () => {
    const file = await makeZipFile();
    vi.mocked(api.listSubscriptions).mockResolvedValueOnce({ Essential: 1 });
    vi.mocked(api.inspect).mockResolvedValueOnce([
      {
        prefix: 'metacall',
        suffix: 'existing-app',
        version: 'v1',
        packages: {},
        ports: [],
        status: 'ready',
      } as never,
    ]);
    localStorage.setItem(
      'faas_deployment_plan_map',
      JSON.stringify({ 'existing-app': 'Essential' }),
    );

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Essential' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Launchpad Slot Occupied')).toBeInTheDocument();
    });
  });
});
