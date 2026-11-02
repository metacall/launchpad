import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PlanPage from '@/features/plan/pages/PlanPage';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('PlanPage', () => {
  it('renders subscription plans', () => {
    render(
      <MemoryRouter>
        <PlanPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Select one of our subscription plans')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Essential' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Standard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Premium' })).toBeInTheDocument();
  });

  it('opens checkout for the selected plan', () => {
    render(
      <MemoryRouter>
        <PlanPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Standard' }));
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getAllByText(/Standard Plan/i).length).toBeGreaterThan(0);
  });
});
