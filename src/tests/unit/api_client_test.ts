import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fetch mock
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
    window.history.pushState({}, '', '/');
  });

  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('faas_token', 'abc123');
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(200, true));
    await api.ready();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer abc123');
  });

  it('does not add Authorization header when no token is stored', async () => {
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(200, true));
    await api.ready();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('clears token and redirects on 401 outside auth routes', async () => {
    localStorage.setItem('faas_token', 'abc123');
    window.history.pushState({}, '', '/dashboard');
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: 'Unauthorized' }));

    await expect(api.inspect()).rejects.toBeDefined();
    expect(localStorage.getItem('faas_token')).toBeNull();
  });

  it('does not clear token on 401 when already on /login', async () => {
    localStorage.setItem('faas_token', 'abc123');
    window.history.pushState({}, '', '/login');
    const api = await loadApi();

    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: 'Unauthorized' }));

    await expect(api.inspect()).rejects.toBeDefined();
    expect(localStorage.getItem('faas_token')).toBe('abc123');
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
    mockFetch.mockResolvedValueOnce(makeResponse(200, [{ suffix: 'existing' }]));

    await expect(api.inspectByName('missing')).rejects.toThrow(
      'Deployment "missing" not found',
    );
  });

  it('login surfaces backend error from a non-2xx response', async () => {
    const api = await loadApi();
    mockFetch.mockResolvedValueOnce(makeResponse(400, { error: 'Invalid credentials' }));

    await expect(api.login('a@b.com', 'bad-pass')).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('login surfaces error message from 2xx body with no token', async () => {
    const api = await loadApi();
    mockFetch.mockResolvedValueOnce(makeResponse(200, { error: 'Account suspended' }));

    await expect(api.login('a@b.com', 'pass')).rejects.toThrow('Account suspended');
  });
});