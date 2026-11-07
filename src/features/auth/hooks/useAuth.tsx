import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  const initialSessionRef = useMemo(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);
    return { token, email };
  }, []);
  const localMode = isLocalMode();
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (initialSessionRef.token && initialSessionRef.email) {
      return { email: initialSessionRef.email };
    }
    // Local launchpad has no accounts: treat the user as signed in without validation.
    if (localMode) return { email: LOCAL_MODE_USER };
    return null;
  });
  const [loading, setLoading] = useState(
    () => !localMode && Boolean(initialSessionRef.token && initialSessionRef.email),
  );

  useEffect(() => {
    if (localMode || !initialSessionRef.token || !initialSessionRef.email) {
      return;
    }

    let active = true;
    if (typeof api.validate !== 'function') {
      queueMicrotask(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    void api
      .validate()
      .then(valid => {
        if (!active) return;
        if (valid) {
          setUser({ email: initialSessionRef.email! });
          return;
        }

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
        localStorage.removeItem('faas_vat_id');
        setUser(null);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
        localStorage.removeItem('faas_vat_id');
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialSessionRef, localMode]);

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
