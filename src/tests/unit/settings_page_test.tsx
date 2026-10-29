import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import { api } from '@/lib/api-client';
import { applyRuntimeConfig } from '@/app/config/runtime';

vi.mock('@/lib/api-client', () => ({
  api: {
    listSubscriptions: vi.fn().mockResolvedValue({}),
    inspect: vi.fn().mockResolvedValue([]),
    listSubscriptionsDeploys: vi.fn().mockResolvedValue([]),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
  getBaseUrl: vi.fn(() => 'http://localhost:9000'),
}));

// Exposes the auth state that ProtectedRoute relies on
function AuthProbe() {
  const { user } = useAuth();
  return <div data-testid="auth-user">{user ? user.email : 'signed-out'}</div>;
}

describe('SettingsPage delete account', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
    localStorage.setItem('faas_vat_id', 'ES123');
    // logout() redirects with window.location.href, which jsdom cannot navigate
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: 'http://localhost/settings' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  const renderPage = async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <AuthProbe />
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.listSubscriptionsDeploys).toHaveBeenCalled());
  };

  it('signs the user out and redirects to /login when confirmed and deletion succeeds', async () => {
    vi.mocked(api.deleteAccount).mockResolvedValueOnce(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('auth-user')).toHaveTextContent('signed-out');
    expect(localStorage.getItem('faas_token')).toBeNull();
    expect(localStorage.getItem('faas_user_email')).toBeNull();
    expect(localStorage.getItem('faas_vat_id')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('keeps the session and shows an error when server deletion fails', async () => {
    vi.mocked(api.deleteAccount).mockRejectedValueOnce(new Error('Account deletion failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(await screen.findByText('Account deletion failed')).toBeInTheDocument();
    expect(screen.getByTestId('auth-user')).toHaveTextContent('alice@example.com');
    expect(localStorage.getItem('faas_token')).toBe('token-1');
    expect(localStorage.getItem('faas_vat_id')).toBe('ES123');
    expect(window.location.href).toBe('http://localhost/settings');
  });

  it('keeps the session when the dialog is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(screen.getByTestId('auth-user')).toHaveTextContent('alice@example.com');
    expect(localStorage.getItem('faas_token')).toBe('token-1');
    expect(localStorage.getItem('faas_user_email')).toBe('alice@example.com');
    expect(localStorage.getItem('faas_vat_id')).toBe('ES123');
    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(window.location.href).toBe('http://localhost/settings');
  });
});

describe('SettingsPage password update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
  });

  const renderPage = async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.listSubscriptionsDeploys).toHaveBeenCalled());
    // The labels have no htmlFor, so take the inputs in order: current, new, confirm
    const [current, next, confirmation] = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    );
    return { current, next, confirmation };
  };

  const submitPasswordForm = async () => {
    const fields = await renderPage();
    fireEvent.change(fields.current, { target: { value: 'oldpass123' } });
    fireEvent.change(fields.next, { target: { value: 'newpass123' } });
    fireEvent.change(fields.confirmation, { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    return fields;
  };

  it('shows the error and keeps the fields when the update fails', async () => {
    vi.mocked(api.changePassword).mockRejectedValueOnce(
      new Error('Password change is not available on this server.'),
    );
    const fields = await submitPasswordForm();

    expect(
      await screen.findByText('Password change is not available on this server.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/updated successfully/i)).not.toBeInTheDocument();
    expect(fields.current).toHaveValue('oldpass123');
    expect(fields.next).toHaveValue('newpass123');
    expect(fields.confirmation).toHaveValue('newpass123');
  });

  it('shows success and clears the fields when the update succeeds', async () => {
    vi.mocked(api.changePassword).mockResolvedValueOnce(true);
    const fields = await submitPasswordForm();

    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
    expect(api.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass123');
    expect(fields.current).toHaveValue('');
    expect(fields.next).toHaveValue('');
    expect(fields.confirmation).toHaveValue('');
  });
});

describe('SettingsPage in local mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    applyRuntimeConfig({ mode: 'local', faasUrl: 'http://localhost:9000' });
  });

  afterEach(() => {
    applyRuntimeConfig({});
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );

  it('shows the local mode notice and the FaaS URL', () => {
    renderPage();

    expect(screen.getByText(/no account in local mode/i)).toBeInTheDocument();
    expect(screen.getByText('http://localhost:9000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard\.metacall\.io/i })).toHaveAttribute(
      'href',
      'https://dashboard.metacall.io',
    );
  });

  it('hides the account, security and billing panels', () => {
    renderPage();

    expect(screen.queryByText('CLI Token')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refresh token/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Company VAT')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing History')).not.toBeInTheDocument();
    expect(screen.queryByText('Active Subscriptions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete account/i })).not.toBeInTheDocument();
  });

  it('does not load billing data', () => {
    renderPage();

    expect(api.listSubscriptions).not.toHaveBeenCalled();
    expect(api.inspect).not.toHaveBeenCalled();
    expect(api.listSubscriptionsDeploys).not.toHaveBeenCalled();
  });

  it('keeps the account panels outside local mode', async () => {
    applyRuntimeConfig({});
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
    renderPage();

    await waitFor(() => expect(api.listSubscriptionsDeploys).toHaveBeenCalled());
    expect(screen.getByText('CLI Token')).toBeInTheDocument();
    expect(screen.queryByText(/no account in local mode/i)).not.toBeInTheDocument();
  });
});
