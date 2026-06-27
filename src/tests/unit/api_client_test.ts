import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * api-client unit tests
 *
 * The api-client now delegates all HTTP calls to @metacall/protocol, which
 * uses native fetch internally and sends:
 *   Authorization: jwt <token>   (when a token is present)
 *
 * We stub globalThis.fetch so the protocol's internal requests are intercepted.
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(
  status: number,
  body?: unknown,
  contentType = 'application/json',
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_header: string) => contentType },
    json: () => Promise.resolve(body),
    text: () =>
      Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

async function loadApi() {
  vi.resetModules();
  const mod = await import('@/lib/api-client');
  return mod.api;
}

describe('api-client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubEnv('VITE_FAAS_TOKEN', '');
    window.history.pushState({}, '', '/');
  });

  it('adds Authorization header (jwt scheme) when token exists', async () => {
    localStorage.setItem('faas_token', 'abc123');
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(200, true));
    await api.ready();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers;
    const auth = headers instanceof Headers
      ? headers.get('Authorization')
      : (headers as Record<string, string> | undefined)?.['Authorization'];
    // Protocol sends "jwt <token>" (not "Bearer")
    expect(auth).toBe('jwt abc123');
  });

  it('does not add Authorization header when no token is stored', async () => {
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(200, true));
    await api.ready();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers;
    const auth = headers instanceof Headers
      ? headers.get('Authorization')
      : (headers as Record<string, string> | undefined)?.['Authorization'];
    // No token → no auth header (or empty/trimmed)
    expect(!auth || auth === 'jwt ' || auth === 'jwt').toBe(true);
  });

  it('inspect rejects when the server returns 401', async () => {
    localStorage.setItem('faas_token', 'abc123');
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: 'Unauthorized' }));

    await expect(api.inspect()).rejects.toBeDefined();
  });

  it('inspect rejects when the server returns 401 on /login page too', async () => {
    localStorage.setItem('faas_token', 'abc123');
    window.history.pushState({}, '', '/login');
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: 'Unauthorized' }));

    await expect(api.inspect()).rejects.toBeDefined();
  });

  it('ready returns true on 200 and false on network failure', async () => {
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(200, 'ok', 'text/plain'));
    await expect(api.ready()).resolves.toBe(true);

    mockFetch.mockRejectedValueOnce(new Error('network'));
    await expect(api.ready()).resolves.toBe(false);
  });

  it('inspectByName throws when deployment is missing', async () => {
    const api = await loadApi();
    // Protocol's inspectByName calls GET /api/inspect and searches the list
    mockFetch.mockResolvedValueOnce(makeResponse(200, [{ suffix: 'existing' }]));

    await expect(api.inspectByName('missing')).rejects.toThrow(/missing/i);
  });

  it('login rejects on a non-2xx response', async () => {
    const api = await loadApi();
    mockFetch.mockResolvedValueOnce(makeResponse(400, { error: 'Invalid credentials' }));

    await expect(api.login('a@b.com', 'bad-pass')).rejects.toBeDefined();
  });

  it('login rejects when 2xx body contains no token field', async () => {
    const api = await loadApi();
    // Protocol's login.ts returns res.text() directly; if the body has no token
    // our wrapper throws "Login failed: no token received"
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, JSON.stringify({ error: 'Account suspended' }), 'text/plain'),
    );

    await expect(api.login('a@b.com', 'pass')).rejects.toThrow(/no token received/i);
  });

  describe('call', () => {
    it('uses GET and correct path when args are empty', async () => {
      vi.stubEnv('VITE_FAAS_URL', 'https://api.metacall.io');
      localStorage.setItem('faas_token', 'my-token');
      const api = await loadApi();

      mockFetch.mockResolvedValueOnce(makeResponse(200, 'hello'));
      const res = await api.call('josead', 'ramda', 'v1', 'dropRepeatsBy', []);

      expect(res).toBe('hello');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.metacall.io/josead/ramda/v1/call/dropRepeatsBy');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();

      const auth = options.headers instanceof Headers
        ? options.headers.get('Authorization')
        : (options.headers as Record<string, string> | undefined)?.['Authorization'];
      expect(auth).toBe('jwt my-token');
    });

    it('uses POST and passes body when args are provided', async () => {
      vi.stubEnv('VITE_FAAS_URL', 'https://api.metacall.io');
      localStorage.setItem('faas_token', 'my-token');
      const api = await loadApi();

      mockFetch.mockResolvedValueOnce(makeResponse(200, { result: 42 }));
      const res = await api.call('josead', 'ramda', 'v1', 'dropRepeatsBy', [1, 2, 3]);

      expect(res).toEqual({ result: 42 });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.metacall.io/josead/ramda/v1/call/dropRepeatsBy');
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify([1, 2, 3]));
    });
    it('replaces dashboard.metacall.io with api.metacall.io in FAAS_URL', async () => {
      vi.stubEnv('VITE_FAAS_URL', 'https://dashboard.metacall.io');
      localStorage.setItem('faas_token', 'my-token');
      const api = await loadApi();

      mockFetch.mockResolvedValueOnce(makeResponse(200, 'hello'));
      const res = await api.call('josead', 'ramda', 'v1', 'indexBy', []);

      expect(res).toBe('hello');
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.metacall.io/josead/ramda/v1/call/indexBy');
    });
  });
});