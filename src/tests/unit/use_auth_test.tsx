import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import { api } from '@/lib/api-client';

// TODO: These tests are basic and primarily ensure the auth hook's state management and localStorage interactions work as expected.
// More comprehensive tests could be added in the future to cover edge cases, error handling, and integration with other components.

vi.mock('@/lib/api-client', () => ({
  api: {
    login: vi.fn(),
    signup: vi.fn(),
    validate: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth / AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
    mockedApi.validate.mockResolvedValue(true);
  });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');
  });

  it('validates and hydrates user from localStorage', async () => {
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toEqual({ email: 'alice@example.com' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual({ email: 'alice@example.com' });
    });
    expect(mockedApi.validate).toHaveBeenCalledTimes(1);
  });

  it('clears an invalid stored session', async () => {
    localStorage.setItem('faas_token', 'expired-token');
    localStorage.setItem('faas_user_email', 'alice@example.com');
    localStorage.setItem('faas_vat_id', 'EE123456789');
    mockedApi.validate.mockResolvedValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    });
    expect(localStorage.getItem('faas_token')).toBeNull();
    expect(localStorage.getItem('faas_user_email')).toBeNull();
    expect(localStorage.getItem('faas_vat_id')).toBeNull();
  });

  it('login stores token/email and updates user', async () => {
    mockedApi.login.mockResolvedValue('token-xyz');
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('dev@example.com', 'secret');
    });

    expect(mockedApi.login).toHaveBeenCalledWith('dev@example.com', 'secret', undefined);
    expect(localStorage.getItem('faas_token')).toBe('token-xyz');
    expect(localStorage.getItem('faas_user_email')).toBe('dev@example.com');
    expect(result.current.user).toEqual({ email: 'dev@example.com' });
  });

  it('signup stores token/email and updates user', async () => {
    mockedApi.signup.mockResolvedValue('token-signup');
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signup('new@example.com', 'secret', 'new-user');
    });

    expect(mockedApi.signup).toHaveBeenCalledWith(
      'new@example.com',
      'secret',
      'new-user',
      undefined,
    );
    expect(localStorage.getItem('faas_token')).toBe('token-signup');
    expect(localStorage.getItem('faas_user_email')).toBe('new@example.com');
    expect(result.current.user).toEqual({ email: 'new@example.com' });
  });

  it('logout clears auth state', () => {
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('faas_token')).toBeNull();
    expect(localStorage.getItem('faas_user_email')).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('logout clears the saved VAT ID but keeps the FaaS URL', () => {
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
    localStorage.setItem('faas_vat_id', 'EE123456789');
    localStorage.setItem('faas_url', 'http://localhost:9000');
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('faas_vat_id')).toBeNull();
    expect(localStorage.getItem('faas_url')).toBe('http://localhost:9000');
  });
});
