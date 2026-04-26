import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '@/features/errors/pages/NotFoundPage';

describe('NotFoundPage', () => {
  it('renders the 404 heading', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText('404')).toBeTruthy();
    expect(screen.getByText(/page not found/i)).toBeTruthy();
  });

  it('renders navigation buttons', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.getByText(/metacall dashboard/i)).toBeTruthy();
  });
});
