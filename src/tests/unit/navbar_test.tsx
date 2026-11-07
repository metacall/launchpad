import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Navbar } from '@/shared/layout/Navbar';
import { AuthProvider } from '@/features/auth/hooks/useAuth';
import { applyRuntimeConfig } from '@/app/config/runtime';

function RouteChangeButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/settings')}>Change route</button>;
}

describe('Navbar component', () => {
  beforeEach(() => {
    localStorage.clear();
    applyRuntimeConfig({});
  });

  it('closes automatically when the route changes', () => {
    localStorage.setItem('faas_token', 'jwt-token-123');
    localStorage.setItem('faas_user_email', 'alice@example.com');

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
        <RouteChangeButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(screen.getAllByText('alice@example.com')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Change route' }));
    expect(screen.getAllByText('alice@example.com')).toHaveLength(1);
  });

  it('uses a 44px mobile menu button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
    expect(menuButton).toHaveClass('w-11', 'h-11');
  });

  it('renders user email and logout button in standard authenticated mode', () => {
    applyRuntimeConfig({});
    localStorage.setItem('faas_token', 'jwt-token-123');
    localStorage.setItem('faas_user_email', 'alice@example.com');

    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('omits logout button in local mode because there is no account', () => {
    applyRuntimeConfig({ mode: 'local' });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Local mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });
});
