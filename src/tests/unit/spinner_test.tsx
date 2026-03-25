import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '@/shared/ui/Spinner';

describe('Spinner', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('applies animate-spin class', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')?.classList.contains('animate-spin')).toBe(true);
  });

  it('applies a custom className', () => {
    const { container } = render(<Spinner className="text-blue-500" />);
    expect(container.querySelector('svg')?.classList.contains('text-blue-500')).toBe(true);
  });

  it('applies a custom size via inline style', () => {
    const { container } = render(<Spinner size={32} />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.style.width).toBe('32px');
    expect(svg.style.height).toBe('32px');
  });

  it('defaults to size 16', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.style.width).toBe('16px');
    expect(svg.style.height).toBe('16px');
  });
});
