import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * Runtime config (`/__launchpad/config`) unit tests.
 *
 * Each test re-imports modules after vi.resetModules() so the module-level
 * runtime config starts empty and is shared by runtime.ts, env.ts and api-client.ts.
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(status: number, body?: unknown, contentType = 'application/json'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_header: string) => contentType },
    json: () =>
      typeof body === 'string'
        ? Promise.reject(new SyntaxError('bad json'))
        : Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

async function loadRuntime() {
  vi.resetModules();
  return import('@/app/config/runtime');
}

function authHeader(call: unknown[]): string | null | undefined {
  const headers = (call[1] as RequestInit | undefined)?.headers;
  return headers instanceof Headers
    ? headers.get('Authorization')
    : (headers as Record<string, string> | undefined)?.['Authorization'];
}

describe('runtime config', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_FAAS_TOKEN', '');
  });

  describe('parseRuntimeConfig', () => {
    it('keeps known fields and strips trailing slashes from faasUrl', async () => {
      const { parseRuntimeConfig } = await loadRuntime();
      expect(
        parseRuntimeConfig({ faasUrl: 'http://localhost:9000/', token: 'local', mode: 'local' }),
      ).toEqual({ faasUrl: 'http://localhost:9000', token: 'local', mode: 'local' });
    });

    it('drops malformed or unknown values', async () => {
      const { parseRuntimeConfig } = await loadRuntime();
      expect(parseRuntimeConfig({ faasUrl: 'not a url', token: '  ', mode: 'dev' })).toEqual({});
      expect(parseRuntimeConfig({ faasUrl: 'javascript:alert(1)', token: 42 })).toEqual({});
      expect(parseRuntimeConfig(null)).toEqual({});
      expect(parseRuntimeConfig(['http://localhost:9000'])).toEqual({});
      expect(parseRuntimeConfig('{"mode":"local"}')).toEqual({});
    });
  });

  describe('loadRuntimeConfig', () => {
    it('fetches /__launchpad/config without caching and parses the result', async () => {
      const { loadRuntimeConfig } = await loadRuntime();
      mockFetch.mockResolvedValueOnce(
        makeResponse(200, { faasUrl: 'http://localhost:9000', mode: 'local' }),
      );

      await expect(loadRuntimeConfig()).resolves.toEqual({
        faasUrl: 'http://localhost:9000',
        mode: 'local',
      });
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/__launchpad/config');
      expect(init.cache).toBe('no-store');
    });

    it('returns an empty config on 404', async () => {
      const { loadRuntimeConfig } = await loadRuntime();
      mockFetch.mockResolvedValueOnce(makeResponse(404, 'Not Found', 'text/plain'));
      await expect(loadRuntimeConfig()).resolves.toEqual({});
    });

    it('returns an empty config when an SPA fallback serves index.html', async () => {
      const { loadRuntimeConfig } = await loadRuntime();
      mockFetch.mockResolvedValueOnce(makeResponse(200, '<!DOCTYPE html>', 'text/html'));
      await expect(loadRuntimeConfig()).resolves.toEqual({});
    });

    it('returns an empty config on invalid JSON', async () => {
      const { loadRuntimeConfig } = await loadRuntime();
      mockFetch.mockResolvedValueOnce(makeResponse(200, '{oops'));
      await expect(loadRuntimeConfig()).resolves.toEqual({});
    });

    it('returns an empty config on network errors', async () => {
      const { loadRuntimeConfig } = await loadRuntime();
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(loadRuntimeConfig()).resolves.toEqual({});
    });

    it('gives up after the timeout', async () => {
      const { loadRuntimeConfig } = await loadRuntime();
      mockFetch.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );
      await expect(loadRuntimeConfig(10)).resolves.toEqual({});
    });
  });

  describe('initRuntimeConfig', () => {
    it('does not probe on the hosted dashboard', async () => {
      const { initRuntimeConfig, getRuntimeConfig } = await loadRuntime();
      await initRuntimeConfig('https://dashboard.metacall.io');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(getRuntimeConfig()).toEqual({});
    });

    it('applies the fetched config elsewhere', async () => {
      const { initRuntimeConfig, getRuntimeConfig, isLocalMode } = await loadRuntime();
      mockFetch.mockResolvedValueOnce(
        makeResponse(200, { faasUrl: 'http://localhost:9000', mode: 'local' }),
      );
      await initRuntimeConfig('http://localhost:9001');
      expect(getRuntimeConfig().faasUrl).toBe('http://localhost:9000');
      expect(isLocalMode()).toBe(true);
    });
  });

  describe('applyRuntimeConfig', () => {
    it("seeds the 'local' token in local mode", async () => {
      const { applyRuntimeConfig } = await loadRuntime();
      applyRuntimeConfig({ mode: 'local' });
      expect(localStorage.getItem('faas_token')).toBe('local');
    });

    it('seeds the configured token in local mode', async () => {
      const { applyRuntimeConfig } = await loadRuntime();
      applyRuntimeConfig({ mode: 'local', token: 'dev-token' });
      expect(localStorage.getItem('faas_token')).toBe('dev-token');
    });

    it('never overwrites an existing token', async () => {
      localStorage.setItem('faas_token', 'real-jwt');
      const { applyRuntimeConfig } = await loadRuntime();
      applyRuntimeConfig({ mode: 'local' });
      applyRuntimeConfig({ mode: 'local', token: 'other' });
      expect(localStorage.getItem('faas_token')).toBe('real-jwt');
    });

    it('does not seed anything outside local mode', async () => {
      const { applyRuntimeConfig } = await loadRuntime();
      applyRuntimeConfig({ mode: 'hosted', token: 'x' });
      applyRuntimeConfig({});
      expect(localStorage.getItem('faas_token')).toBeNull();
    });
  });

  describe('FaaS URL resolution', () => {
    it('prefers the runtime faasUrl over localStorage and VITE_FAAS_URL', async () => {
      localStorage.setItem('faas_url', 'http://stale-override:9000');
      vi.stubEnv('VITE_FAAS_URL', 'https://api.metacall.io');
      const { applyRuntimeConfig } = await loadRuntime();
      const { getBaseUrl } = await import('@/lib/api-client');
      const { env } = await import('@/app/config/env');

      applyRuntimeConfig({ faasUrl: 'http://localhost:9100' });

      expect(getBaseUrl()).toBe('http://localhost:9100');
      expect(env.FAAS_URL).toBe('http://localhost:9100');
    });

    it('keeps the existing chain when the runtime config is empty', async () => {
      vi.stubEnv('VITE_FAAS_URL', 'https://api.metacall.io');
      const { applyRuntimeConfig } = await loadRuntime();
      const { getBaseUrl } = await import('@/lib/api-client');
      const { env } = await import('@/app/config/env');

      applyRuntimeConfig({});

      expect(getBaseUrl()).toBe('https://api.metacall.io');
      expect(env.FAAS_URL).toBe('https://api.metacall.io');
    });

    it('uses the localStorage URL over VITE_FAAS_URL when the runtime config has none', async () => {
      localStorage.setItem('faas_url', 'http://saved-faas:9000');
      vi.stubEnv('VITE_FAAS_URL', 'https://api.metacall.io');
      const { applyRuntimeConfig } = await loadRuntime();
      const { getBaseUrl } = await import('@/lib/api-client');
      const { env } = await import('@/app/config/env');

      applyRuntimeConfig({});

      expect(getBaseUrl()).toBe('http://saved-faas:9000');
      expect(env.FAAS_URL).toBe('http://saved-faas:9000');
    });

    it('routes function calls to the runtime faasUrl', async () => {
      const { applyRuntimeConfig } = await loadRuntime();
      const { api } = await import('@/lib/api-client');
      applyRuntimeConfig({ faasUrl: 'http://localhost:9100', mode: 'local' });

      mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));
      await api.call('prefix', 'suffix', 'v1', 'fn', []);

      const call = mockFetch.mock.calls[0] as unknown[];
      expect(call[0]).toBe('http://localhost:9100/prefix/suffix/v1/call/fn');
      expect(authHeader(call)).toBe('jwt local');
    });
  });

  describe('token resolution', () => {
    it('uses the runtime token when no token is stored', async () => {
      const { applyRuntimeConfig } = await loadRuntime();
      const { api } = await import('@/lib/api-client');
      applyRuntimeConfig({ faasUrl: 'http://localhost:9000', token: 'runtime-token' });

      mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));
      await api.call('p', 's', 'v1', 'fn', []);

      expect(authHeader(mockFetch.mock.calls[0] as unknown[])).toBe('jwt runtime-token');
    });

    it('prefers a stored token over the runtime token', async () => {
      localStorage.setItem('faas_token', 'stored-token');
      const { applyRuntimeConfig } = await loadRuntime();
      const { api } = await import('@/lib/api-client');
      applyRuntimeConfig({ faasUrl: 'http://localhost:9000', token: 'runtime-token' });

      mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));
      await api.call('p', 's', 'v1', 'fn', []);

      expect(authHeader(mockFetch.mock.calls[0] as unknown[])).toBe('jwt stored-token');
    });
  });

  describe('auth in local mode', () => {
    async function renderAuth() {
      const { AuthProvider, useAuth } = await import('@/features/auth/hooks/useAuth');
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      return renderHook(() => useAuth(), { wrapper }).result;
    }

    it('treats the user as signed in when mode is local', async () => {
      const { applyRuntimeConfig } = await loadRuntime();
      applyRuntimeConfig({ mode: 'local' });
      const result = await renderAuth();
      expect(result.current.user).not.toBeNull();
    });

    it('keeps a real logged-in user in local mode', async () => {
      localStorage.setItem('faas_token', 'real-jwt');
      localStorage.setItem('faas_user_email', 'alice@example.com');
      const { applyRuntimeConfig } = await loadRuntime();
      applyRuntimeConfig({ mode: 'local' });
      const result = await renderAuth();
      expect(result.current.user).toEqual({ email: 'alice@example.com' });
    });

    it('still requires login without a runtime config', async () => {
      await loadRuntime();
      const result = await renderAuth();
      expect(result.current.user).toBeNull();
    });
  });
});
