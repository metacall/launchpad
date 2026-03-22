import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const DeployWizardPage = lazy(() => import('@/pages/deployments/DeployWizard'));
const DeployRepositoryPage = lazy(() => import('@/pages/deployments/DeployRepositoryPage'));
const DeploymentDetailPage = lazy(() => import('@/pages/deployments/DeploymentFunctionPage'));
const LogsViewerPage = lazy(() => import('@/pages/logs/LogsViewerPage'));
const DeployHubPage = lazy(() => import('@/pages/deployments/DeployPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const PlanPage = lazy(() => import('@/pages/plan/PlanPage'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));

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

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
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
                        <Route path="/deployments" element={<Navigate to="/" replace />} />
                        <Route path="/deployments/new" element={<DeployHubPage />} />
                        <Route path="/deployments/new/wizard" element={<DeployWizardPage />} />
                        <Route path="/deployments/new/repository" element={<DeployRepositoryPage />} />
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
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
