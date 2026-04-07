import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoginPage from '@/features/auth/pages/LoginPage';
import SignupPage from '@/features/auth/pages/SignupPage';
import { AppShell } from '@/shared/layout/AppShell';
import { SVGLoader, AuthLoadingPattern, RouteLoadingPattern } from '@/shared/ui/LoadingState';

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

const FullPageSpinner = () => <AuthLoadingPattern />;

const PageLoader = () => <RouteLoadingPattern />;

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
