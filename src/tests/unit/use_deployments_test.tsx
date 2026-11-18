import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeployments } from '@/features/deployments/hooks/useDeployments';
import { api } from '@/lib/api-client';
import type { Deployment } from '@/shared/types';

vi.mock('@/lib/api-client', () => ({
  api: {
    inspect: vi.fn(),
  },
  isAbortError: (err: unknown) =>
    err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError'),
}));

const mockedInspect = vi.mocked(api.inspect);

const deployment = (suffix: string) => ({ suffix, status: 'ready' }) as unknown as Deployment;

let tabHidden = false;

// Let the pending inspect() promise settle inside act()
const flush = () => act(async () => {});

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('useDeployments', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    tabHidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => tabHidden });
    mockedInspect.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the deployments and stops loading', async () => {
    mockedInspect.mockResolvedValueOnce([deployment('app-1')]);
    const { result } = renderHook(() => useDeployments());

    expect(result.current.loading).toBe(true);
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.deployments).toEqual([deployment('app-1')]);
    expect(result.current.error).toBeNull();
  });

  it('shows the error message when the request fails', async () => {
    mockedInspect.mockRejectedValueOnce(new Error('FaaS is not reachable'));
    const { result } = renderHook(() => useDeployments());
    await flush();

    expect(result.current.error).toBe('FaaS is not reachable');
    expect(result.current.loading).toBe(false);
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    mockedInspect.mockRejectedValueOnce('boom');
    const { result } = renderHook(() => useDeployments());
    await flush();

    expect(result.current.error).toBe('Failed to fetch deployments');
  });

  it('ignores aborted requests', async () => {
    mockedInspect.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );
    const { result } = renderHook(() => useDeployments());
    await flush();

    expect(result.current.error).toBeNull();
  });

  it('keeps the last deployments and clears the error after a later successful poll', async () => {
    mockedInspect
      .mockResolvedValueOnce([deployment('app-1')])
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce([deployment('app-1'), deployment('app-2')]);
    const { result } = renderHook(() => useDeployments(1_000));
    await flush();

    await advance(1_000);
    expect(result.current.error).toBe('temporary failure');
    expect(result.current.deployments).toEqual([deployment('app-1')]);

    await advance(1_000);
    expect(result.current.error).toBeNull();
    expect(result.current.deployments).toEqual([deployment('app-1'), deployment('app-2')]);
  });

  it('polls again after the interval while the tab is visible', async () => {
    renderHook(() => useDeployments(1_000));
    await flush();
    expect(mockedInspect).toHaveBeenCalledTimes(1);

    await advance(1_000);
    expect(mockedInspect).toHaveBeenCalledTimes(2);

    await advance(1_000);
    expect(mockedInspect).toHaveBeenCalledTimes(3);
  });

  it('does not poll while the tab is hidden', async () => {
    renderHook(() => useDeployments(1_000));
    await flush();
    tabHidden = true;

    await advance(5_000);

    expect(mockedInspect).toHaveBeenCalledTimes(1);
  });

  it('fetches again as soon as the tab becomes visible', async () => {
    renderHook(() => useDeployments(30_000));
    await flush();
    tabHidden = true;
    await advance(1_000);

    tabHidden = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();

    expect(mockedInspect).toHaveBeenCalledTimes(2);
  });

  it('fetches again when refetch is called', async () => {
    const { result } = renderHook(() => useDeployments(30_000));
    await flush();

    act(() => {
      result.current.refetch();
    });
    await flush();

    expect(mockedInspect).toHaveBeenCalledTimes(2);
  });

  it('aborts the request and stops polling on unmount', async () => {
    const { unmount } = renderHook(() => useDeployments(1_000));
    await flush();
    const signal = mockedInspect.mock.calls[0][0] as AbortSignal;

    unmount();
    await advance(5_000);

    expect(signal.aborted).toBe(true);
    expect(mockedInspect).toHaveBeenCalledTimes(1);
  });
});
