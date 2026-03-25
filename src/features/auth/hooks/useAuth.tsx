import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { api } from '@/lib/api-client';

interface AuthUser {
    email: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, alias: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'faas_token';
const EMAIL_KEY = 'faas_user_email';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const email = localStorage.getItem(EMAIL_KEY);
        return token && email ? { email } : null;
    });

    const loading = false;

    const login = useCallback(async (email: string, password: string) => {
        const token = await api.login(email, password);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EMAIL_KEY, email);
        setUser({ email });
    }, []);

    const signup = useCallback(async (email: string, password: string, alias: string) => {
        const token = await api.signup(email, password, alias);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EMAIL_KEY, email);
        setUser({ email });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
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
