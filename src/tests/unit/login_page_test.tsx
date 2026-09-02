import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/features/auth/pages/LoginPage';
import { MemoryRouter } from 'react-router-dom';

// Mock Turnstile component to avoid running actual widget code in jsdom
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    return (
      <div data-testid="turnstile-widget">
        <button type="button" onClick={() => onSuccess('mocked-captcha-token')}>
          Solve Captcha
        </button>
      </div>
    );
  },
}));

// Mock the Auth hook since we are testing the component, not the auth context itself
const mockLogin = vi.fn();
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

  it('renders email and password inputs', () => {
    renderWithRouter();

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button', { name: /Login/i })
        .find(btn => btn.getAttribute('type') === 'submit') as HTMLElement,
    ).toBeInTheDocument();
  });

  it('submits the form with email, password and empty captcha when no site key is present', async () => {
    // VITE_TURNSTILE_SITE_KEY is mocked as empty/undefined by default in tests or we can just rely on the fallback
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');

    renderWithRouter();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText('Password');
    const loginBtn = screen
      .getAllByRole('button', { name: /Login/i })
      .find(btn => btn.getAttribute('type') === 'submit') as HTMLElement;

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123', '');
    });
  });

  it('renders Turnstile widget and submits the token when site key is present', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'mock-site-key');

    renderWithRouter();

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText('Password');
    const loginBtn = screen
      .getAllByRole('button', { name: /Login/i })
      .find(btn => btn.getAttribute('type') === 'submit') as HTMLElement;

    fireEvent.change(emailInput, { target: { value: 'secure@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Simulate solving the captcha
    const solveCaptchaBtn = screen.getByRole('button', { name: /Solve Captcha/i });
    fireEvent.click(solveCaptchaBtn);

    // Submit form
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'secure@example.com',
        'password123',
        'mocked-captcha-token',
      );
    });
  });

  it('displays error message when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    renderWithRouter();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText('Password');
    const loginBtn = screen
      .getAllByRole('button', { name: /Login/i })
      .find(btn => btn.getAttribute('type') === 'submit') as HTMLElement;

    fireEvent.change(emailInput, { target: { value: 'fail@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
