import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import { setUnauthorizedHandler } from '@/lib/api-client';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Rendered once inside AuthProvider + BrowserRouter, so both useAuth()
 * and useNavigate() are available. Registers the 401 auto-logout callback.
 */
function UnauthorizedHandlerRegistrar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });
    // Run once on mount; logout and navigate are stable refs.
  }, [logout, navigate]);

  return null;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UnauthorizedHandlerRegistrar />
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}
