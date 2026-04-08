import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation, Outlet } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoginPage from '@/features/auth/pages/LoginPage';
import SignupPage from '@/features/auth/pages/SignupPage';
import { AppShell } from '@/shared/layout/AppShell';
import { AuthLoadingPattern, RouteLoadingPattern } from '@/shared/ui/LoadingState';

// Lazy-loaded components
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const DeploymentsPage = lazy(() => import('@/features/deployments/pages/DeploymentsPage'));
const DeployWizardPage = lazy(() => import('@/features/deployments/components/DeployWizard'));
const DeployRepositoryPage = lazy(() => import('@/features/deployments/pages/DeployRepositoryPage'));
const DeploymentDetailPage = lazy(() => import('@/features/deployments/pages/DeploymentFunctionPage'));
const LogsViewerPage = lazy(() => import('@/features/logs/pages/LogsViewerPage'));
const DeployHubPage = lazy(() => import('@/features/deployments/pages/DeployPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const PlanPage = lazy(() => import('@/features/plan/pages/PlanPage'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));
const NotFoundPage = lazy(() => import('@/features/errors/pages/NotFoundPage'));

const FullPageSpinner = () => <AuthLoadingPattern />;
const PageLoader = () => <RouteLoadingPattern />;

// Fallback for when a lazy-loaded chunk fails (e.g., after a new deployment)
const RouteErrorFallback = () => (
  <div role="alert" className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
    <h2 className="text-xl font-semibold mb-2">Something went wrong loading this page.</h2>
    <p className="text-gray-600 mb-4">There might be a new version of the app available.</p>
    <button 
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      Refresh Page
    </button>
  </div>
);

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  
  // Pass the target location to the login page so we can redirect them back later
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Renders nested routes instead of children
  return <Outlet />; 
}

function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Check if they were trying to go somewhere specific, otherwise default to "/"
  const from = location.state?.from?.pathname || "/";

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={from} replace />;
  
  return <Outlet />;
}

// AppShell Layout Wrapper
function AppLayout() {
  return (
    <AppShell>
      <ErrorBoundary FallbackComponent={RouteErrorFallback}>
        <Suspense fallback={<PageLoader />}>
          <Outlet /> {/* Renders the matched child route component */}
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public/Guest Routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Protected Routes utilizing Layout Pattern */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          
          <Route path="/deployments">
            <Route index element={<DeploymentsPage />} />
            <Route path="new" element={<DeployHubPage />} />
            <Route path="new/wizard" element={<DeployWizardPage />} />
            <Route path="new/repository" element={<DeployRepositoryPage />} />
            <Route path=":id" element={<DeploymentDetailPage />} />
            <Route path=":id/logs" element={<LogsViewerPage />} />
          </Route>

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/plans" element={<PlanPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}