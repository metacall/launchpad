import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/shared/errors/ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>Safe content</div>;
}

const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => { console.error = vi.fn(); });
  afterEach(() => { console.error = originalConsoleError; });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe content')).toBeTruthy();
  });

  it('renders the default fallback when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={err => <p>Custom: {err.message}</p>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/custom: test explosion/i)).toBeTruthy();
  });

  it('resets state after clicking "Try again"', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
  });
});
