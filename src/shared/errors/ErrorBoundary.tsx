import { Component, type ErrorInfo, type ReactNode } from 'react';
import { DefaultFallback } from './DefaultFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Receives the caught error. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this would send to your error-tracking service like Sentry, but for now we'll just log it.
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      return fallback
        ? fallback(error, this.reset)
        : <DefaultFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}
