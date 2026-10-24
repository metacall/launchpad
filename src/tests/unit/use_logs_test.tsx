import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deployment } from '@/shared/types';
import { api } from '@/lib/api-client';
import { useLogs } from '@/features/logs/hooks/useLogs';

vi.mock('@/lib/api-client', () => ({
  api: {
    logs: vi.fn(),
    inspectByName: vi.fn(),
  },
  isAbortError: (err: unknown) => err instanceof Error && err.name === 'AbortError',
  isApiError: () => false,
}));

const mockedApi = vi.mocked(api);

function deploymentWithStatus(status: string): Deployment {
  return { status } as Deployment;
}

async function flushHook() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useLogs polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockedApi.logs.mockResolvedValue('2026-10-24T12:00:00Z [INFO] - app | started');
    mockedApi.inspectByName.mockResolvedValue(deploymentWithStatus('building'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('continues polling deployments that are still progressing', async () => {
    renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    expect(mockedApi.logs).toHaveBeenCalledTimes(1);
    expect(mockedApi.inspectByName).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockedApi.logs).toHaveBeenCalledTimes(2);
    expect(mockedApi.inspectByName).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('returns parsed runtime logs including their timestamps', async () => {
    const { result } = renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    expect(mockedApi.logs).toHaveBeenCalledWith(
      'my-app',
      'my-prefix',
      'deploy',
      expect.any(AbortSignal),
    );
    expect(result.current.logs).toEqual([
      { timestamp: '12:00:00', level: 'info', message: '[app] started' },
    ]);
  });

  it('handles empty runtime logs without reporting an error', async () => {
    mockedApi.logs.mockResolvedValue('');
    const { result } = renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    expect(result.current.logs).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('surfaces runtime log retrieval errors and retries with bounded back-off', async () => {
    mockedApi.logs.mockRejectedValue(new Error('logs unavailable'));
    const { result } = renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    expect(result.current.error).toBe('logs unavailable');
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockedApi.logs).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it.each(['ready', 'failed', 'error', 'fail', 'stopped'])(
    'stops polling terminal deployment status "%s"',
    async status => {
      mockedApi.inspectByName.mockResolvedValue(deploymentWithStatus(status));

      renderHook(() => useLogs('my-app', 'my-prefix', 1000));
      await flushHook();

      expect(mockedApi.logs).toHaveBeenCalledTimes(1);
      expect(mockedApi.inspectByName).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(mockedApi.logs).toHaveBeenCalledTimes(1);
    },
  );

  it('cancels subsequent polling when a progressing deployment becomes terminal', async () => {
    mockedApi.inspectByName
      .mockResolvedValueOnce(deploymentWithStatus('building'))
      .mockResolvedValueOnce(deploymentWithStatus('failed'));

    renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockedApi.logs).toHaveBeenCalledTimes(2);
    expect(mockedApi.inspectByName).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(mockedApi.logs).toHaveBeenCalledTimes(2);
  });

  it('does not retry failed log retrieval after the deployment is terminal', async () => {
    mockedApi.logs.mockRejectedValue(new Error('logs unavailable'));
    mockedApi.inspectByName.mockResolvedValue(deploymentWithStatus('failed'));

    const { result } = renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    expect(result.current.error).toBe('logs unavailable');
    expect(mockedApi.logs).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(mockedApi.logs).toHaveBeenCalledTimes(1);
  });

  it('does not schedule polling when an in-flight request resolves after cleanup', async () => {
    let resolveLogs!: (value: string) => void;
    mockedApi.logs.mockReturnValue(
      new Promise(resolve => {
        resolveLogs = resolve;
      }),
    );

    const { unmount } = renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    unmount();

    await act(async () => {
      resolveLogs('late log output');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedApi.inspectByName).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a scheduled poll when the hook is unmounted', async () => {
    const { unmount } = renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    expect(vi.getTimerCount()).toBe(1);
    unmount();

    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mockedApi.logs).toHaveBeenCalledTimes(1);
  });

  it('keeps only one timer when visibility triggers an immediate refresh', async () => {
    renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flushHook();

    expect(mockedApi.logs).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('does not start a second fetch when visibility changes during polling', async () => {
    let resolveLogs!: (value: string) => void;
    renderHook(() => useLogs('my-app', 'my-prefix', 1000));
    await flushHook();

    mockedApi.logs.mockReturnValueOnce(
      new Promise(resolve => {
        resolveLogs = resolve;
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mockedApi.logs).toHaveBeenCalledTimes(2);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockedApi.logs).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveLogs('second log output');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedApi.inspectByName).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });
});
