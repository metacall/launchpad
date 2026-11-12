import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

describe('AppRouter deployment route params', () => {
  it('exposes suffix from /deployments/:suffix path', () => {
    function SuffixReader() {
      const { suffix } = useParams<{ suffix: string }>();
      return <div data-testid="suffix">{suffix ?? 'undefined'}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/deployments/my-deploy-abc123']}>
        <Routes>
          <Route path="/deployments/:suffix" element={<SuffixReader />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('suffix').textContent).toBe('my-deploy-abc123');
  });

  it('does not expose id param on the deployment suffix route', () => {
    function IdReader() {
      const params = useParams<{ id?: string }>();
      return <div data-testid="id-param">{params.id ?? 'undefined'}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/deployments/my-deploy-abc123']}>
        <Routes>
          <Route path="/deployments/:suffix" element={<IdReader />} />
        </Routes>
      </MemoryRouter>,
    );

    // With :suffix route, accessing params.id gives undefined
    expect(screen.getByTestId('id-param').textContent).toBe('undefined');
  });
});
