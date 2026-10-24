import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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
  isApiError: (error: unknown) => error instanceof Error && 'status' in error,
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
    vi.mocked(api.upload).mockResolvedValue('resource-id');
    vi.mocked(api.deploy).mockResolvedValue({
      suffix: 'test-dep',
      prefix: 'test-prefix',
      version: 'v1',
    });
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

  it('uploads and deploys successfully before showing progress', async () => {
    const file = await makeZipFile();

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const deployButton = await screen.findByRole('button', { name: 'Deploy' });
    await waitFor(() => expect(deployButton).toBeEnabled());
    fireEvent.click(deployButton);

    await waitFor(() => {
      expect(api.upload).toHaveBeenCalledTimes(1);
      expect(api.deploy).toHaveBeenCalledWith('test', [], expect.any(String), 'Package');
      expect(screen.getByText('Deploying')).toBeInTheDocument();
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

  it('shows package validation errors inline and does not upload invalid archives', async () => {
    const invalidFile = new File(['not a zip'], 'invalid.zip', { type: 'application/zip' });

    render(
      <MemoryRouter initialEntries={[{ state: { file: invalidFile, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to read this ZIP package');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Deploy' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));

    await waitFor(() => {
      expect(vi.mocked(api.upload)).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Select at least one file');
    });
  });

  it('shows upload failures inline, stays on the wizard, and permits a retry', async () => {
    const file = await makeZipFile();
    vi.mocked(api.upload)
      .mockRejectedValueOnce(new Error('upload unavailable: super-secret-value'))
      .mockResolvedValueOnce('resource-id');

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const deployButton = await screen.findByRole('button', { name: 'Deploy' });
    await waitFor(() => expect(deployButton).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Environment Variables/ }));
    fireEvent.change(screen.getByPlaceholderText('VALUE'), {
      target: { value: 'super-secret-value' },
    });
    fireEvent.click(deployButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Upload failed: upload unavailable: [redacted]',
    );
    expect(screen.queryByText('super-secret-value')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deploy' })).toBeInTheDocument();
    expect(vi.mocked(api.deploy)).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));
    await waitFor(() => {
      expect(vi.mocked(api.upload)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(api.deploy)).toHaveBeenCalledTimes(1);
    });
  });

  it('shows deployment request failures inline without advancing to progress', async () => {
    const file = await makeZipFile();
    vi.mocked(api.deploy).mockRejectedValueOnce(new Error('deployment rejected'));

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const deployButton = await screen.findByRole('button', { name: 'Deploy' });
    await waitFor(() => expect(deployButton).toBeEnabled());
    fireEvent.click(deployButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deployment request failed: deployment rejected',
    );
    expect(screen.getByRole('button', { name: 'Deploy' })).toBeInTheDocument();
    expect(screen.queryByText('Deployment in Progress')).not.toBeInTheDocument();
  });

  it('uses a safe message for API errors instead of exposing server paths', async () => {
    const file = await makeZipFile();
    vi.mocked(api.upload).mockRejectedValueOnce(
      Object.assign(new Error('HTTP 500: /srv/metacall/private/runtime.log'), { status: 500 }),
    );

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const deployButton = await screen.findByRole('button', { name: 'Deploy' });
    await waitFor(() => expect(deployButton).toBeEnabled());
    fireEvent.click(deployButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Upload failed: The FaaS server encountered an error. Try again shortly.',
    );
    expect(screen.queryByText('/srv/metacall/private/runtime.log')).not.toBeInTheDocument();
  });

  it('prevents concurrent submissions while the upload request is pending', async () => {
    const file = await makeZipFile();
    let resolveUpload!: (resourceId: string) => void;
    vi.mocked(api.upload).mockReturnValue(
      new Promise(resolve => {
        resolveUpload = resolve;
      }),
    );

    render(
      <MemoryRouter initialEntries={[{ state: { file, plan: 'Free' } }]}>
        <DeployWizardPage />
      </MemoryRouter>,
    );

    const deployButton = await screen.findByRole('button', { name: 'Deploy' });
    await waitFor(() => expect(deployButton).toBeEnabled());
    await act(async () => {
      fireEvent.click(deployButton);
      fireEvent.click(deployButton);
      await Promise.resolve();
    });

    await waitFor(() => expect(vi.mocked(api.upload)).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveUpload('resource-id');
    });
    await waitFor(() => expect(vi.mocked(api.deploy)).toHaveBeenCalledTimes(1));
  });
});
