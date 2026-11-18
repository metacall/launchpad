import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import { LS_TOKEN_KEY, LS_EMAIL_KEY } from '@/shared/constants';
import { isLocalMode } from '@/app/config/runtime';

const LOCAL_MODE_USER = 'Local mode';

interface AuthUser {
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signup: (email: string, password: string, alias: string, captchaToken?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Token/email keys are defined once in src/shared/constants/index.ts
const TOKEN_KEY = LS_TOKEN_KEY;
const EMAIL_KEY = LS_EMAIL_KEY;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);
    if (token && email) return { email };
    // Local launchpad has no accounts: treat the user as signed in instead of redirecting to /login.
    return isLocalMode() ? { email: LOCAL_MODE_USER } : null;
  });

  const loading = false;

  const login = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const token = await api.login(email, password, captchaToken);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    setUser({ email });
  }, []);

  const signup = useCallback(
    async (email: string, password: string, alias: string, captchaToken?: string) => {
      const token = await api.signup(email, password, alias, captchaToken);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EMAIL_KEY, email);
      setUser({ email });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem('faas_vat_id');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
