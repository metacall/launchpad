import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from '@/features/auth/pages/SignupPage';
import { MemoryRouter } from 'react-router-dom';

// Mock Turnstile component
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

const mockSignup = vi.fn();
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    signup: mockSignup,
    user: null,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SignupPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

  it('renders required input fields', () => {
    renderWithRouter();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Alias')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Password confirmation')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('submits the form with email, password, alias and empty captcha when no site key is present', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');

    renderWithRouter();

    const emailInput = screen.getByLabelText('Email');
    const aliasInput = screen.getByLabelText('Alias');
    const passwordInput = screen.getByLabelText('Password');
    const confirmInput = screen.getByLabelText('Password confirmation');
    const termsCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(aliasInput, { target: { value: 'user123' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(termsCheckbox);

    // Submit form
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('user@example.com', 'password123', 'user123', '');
    });
  });

  it('renders Turnstile widget and submits the token when site key is present', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'mock-site-key');

    renderWithRouter();

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();

    const emailInput = screen.getByLabelText('Email');
    const aliasInput = screen.getByLabelText('Alias');
    const passwordInput = screen.getByLabelText('Password');
    const confirmInput = screen.getByLabelText('Password confirmation');
    const termsCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(emailInput, { target: { value: 'secure@example.com' } });
    fireEvent.change(aliasInput, { target: { value: 'secure123' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(termsCheckbox);

    // Simulate solving the captcha
    const solveCaptchaBtn = screen.getByRole('button', { name: /Solve Captcha/i });
    fireEvent.click(solveCaptchaBtn);

    // Submit form
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        'secure@example.com',
        'password123',
        'secure123',
        'mocked-captcha-token',
      );
    });
  });

  it('displays error message when passwords do not match', async () => {
    renderWithRouter();

    const emailInput = screen.getByLabelText('Email');
    const aliasInput = screen.getByLabelText('Alias');
    const passwordInput = screen.getByLabelText('Password');
    const confirmInput = screen.getByLabelText('Password confirmation');
    const termsCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(emailInput, { target: { value: 'fail@example.com' } });
    fireEvent.change(aliasInput, { target: { value: 'fail123' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'wrongmatch' } });
    fireEvent.click(termsCheckbox);

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });
});
