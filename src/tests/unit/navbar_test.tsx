import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Navbar } from '@/shared/layout/Navbar';
import { useAuth } from '@/features/auth/hooks/useAuth';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

function RouteChangeButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/settings')}>Change route</button>;
}

describe('Navbar mobile menu', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'alice@example.com' },
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('closes automatically when the route changes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
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
        <Navbar />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
    expect(menuButton).toHaveClass('w-11', 'h-11');
  });
});
