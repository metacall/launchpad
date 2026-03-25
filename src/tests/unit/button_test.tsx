import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/shared/ui/Button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeTruthy();
  });

  it('is disabled when loading=true', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary variant classes by default', () => {
    const { container } = render(<Button>Primary</Button>);
    expect(container.querySelector('button')!.className).toContain('bg-[--color-primary]');
  });

  it('applies danger variant classes', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.querySelector('button')!.className).toContain('text-[--color-status-failed]');
  });

  it('shows a spinner when loading', () => {
    const { container } = render(<Button loading>Saving</Button>);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
