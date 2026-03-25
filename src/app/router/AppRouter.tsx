import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoginPage from '@/features/auth/pages/LoginPage';
import SignupPage from '@/features/auth/pages/SignupPage';
import { AppShell } from '@/shared/layout/AppShell';
import { Spinner } from '@/shared/ui/Spinner';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const DeploymentsPage = lazy(() => import('@/features/deployments/pages/DeploymentsPage'));
const DeployWizardPage = lazy(
  () => import('@/features/deployments/components/DeployWizard'),
);
const DeployRepositoryPage = lazy(
  () => import('@/features/deployments/pages/DeployRepositoryPage'),
);
const DeploymentDetailPage = lazy(
  () => import('@/features/deployments/pages/DeploymentFunctionPage'),
);
const LogsViewerPage = lazy(() => import('@/features/logs/pages/LogsViewerPage'));
const DeployHubPage = lazy(() => import('@/features/deployments/pages/DeployPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const PlanPage = lazy(() => import('@/features/plan/pages/PlanPage'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));
const NotFoundPage = lazy(() => import('@/features/errors/pages/NotFoundPage'));

const FullPageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner size={28} className="text-blue-500" />
  </div>
);

const PageLoader = () => (
  <div className="grow flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <Spinner size={24} className="text-blue-500" />
      <span className="text-sm font-medium text-slate-500 animate-pulse tracking-widest uppercase">
        Loading route...
      </span>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/deployments" element={<DeploymentsPage />} />
                  <Route path="/deployments/new" element={<DeployHubPage />} />
                  <Route path="/deployments/new/wizard" element={<DeployWizardPage />} />
                  <Route
                    path="/deployments/new/repository"
                    element={<DeployRepositoryPage />}
                  />
                  <Route path="/deployments/:id" element={<DeploymentDetailPage />} />
                  <Route path="/deployments/:id/logs" element={<LogsViewerPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/plans" element={<PlanPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
