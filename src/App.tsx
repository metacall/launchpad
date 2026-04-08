import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';
import { ErrorBoundary } from '@/shared/errors/ErrorBoundary';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </AppProviders>
    </ErrorBoundary>
  );
}
