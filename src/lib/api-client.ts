import type { Deployment, Plans } from '@/shared/types';

const BASE_URL = (import.meta.env.VITE_FAAS_URL as string | undefined) ?? '';
const TOKEN_KEY = 'faas_token';
const TIMEOUT_MS = 10_000;

function getToken(): string {
  // Only use the token the user explicitly received from login/signup.
  // We intentionally do NOT fall back to VITE_FAAS_TOKEN so that
  // every session must go through the login flow.
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

// A typed HTTP error returned when the server responds with a non-2xx status.
// Replaces AxiosError — consumers can check `err instanceof ApiError`
// and inspect `err.status` / `err.data`.
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** True when `err` is a non-2xx response error from our HTTP layer. */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** True when `err` is a cancelled or timed-out request (AbortError / TimeoutError). */
export function isAbortError(err: unknown): err is Error {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.name === 'TimeoutError')
  );
}

// Internal HTTP helper
async function _request<T>(
  method: string,
  path: string,
  options: {
    body?: BodyInit | null;
    extraHeaders?: Record<string, string>;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const { body, extraHeaders, signal } = options;

  const timeoutSig = AbortSignal.timeout(TIMEOUT_MS);
  const effectiveSig = signal ? AbortSignal.any([signal, timeoutSig]) : timeoutSig;

  const headers: Record<string, string> = { ...extraHeaders };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ?? null,
    signal: effectiveSig,
  });

  if (res.status === 401) {
    const onAuthPage =
      window.location.pathname === '/login' ||
      window.location.pathname === '/signup';
    if (!onAuthPage) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
    }
    const serverMsg = (data as { error?: string } | null)?.error;
    throw new ApiError(
      serverMsg ?? `Request failed with status ${res.status}`,
      res.status,
      data,
    );
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

function _get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return _request<T>('GET', path, { signal });
}

function _post<T>(
  path: string,
  body?: unknown,
  opts: { extraHeaders?: Record<string, string>; signal?: AbortSignal } = {},
): Promise<T> {
  const rawBody =
    body === undefined
      ? null
      : body instanceof FormData
        ? body
        : JSON.stringify(body);
  return _request<T>('POST', path, {
    body: rawBody,
    extraHeaders: opts.extraHeaders,
    signal: opts.signal,
  });
}

// Error utilit
function extractError(err: unknown, fallback: string): never {
  if (isApiError(err)) {
    const serverMsg = (err.data as { error?: string } | null)?.error;
    throw new Error(serverMsg ?? err.message ?? fallback);
  }
  throw new Error(err instanceof Error ? err.message : fallback);
}

export interface EnvVar {
  name: string;
  value: string;
}

export type ResourceType = 'Package' | 'Repository';

// Public API object
export const api = {
  ready: async (signal?: AbortSignal): Promise<boolean> => {
    try {
      await _get<unknown>('/api/readiness', signal);
      return true;
    } catch {
      return false;
    }
  },

  inspect: async (signal?: AbortSignal): Promise<Deployment[]> => {
    return _get<Deployment[]>('/api/inspect', signal);
  },

  inspectByName: async (suffix: string, signal?: AbortSignal): Promise<Deployment> => {
    const all = await api.inspect(signal);
    const found = all.find(d => d.suffix === suffix);
    if (!found) throw new Error(`Deployment "${suffix}" not found`);
    return found;
  },

  upload: async (name: string, file: File): Promise<string> => {
    const form = new FormData();
    form.append('id', name);
    form.append('blob', file);
    // No explicit Content-Typ browser sets multipart/form-data with boundary.
    return _post<string>('/api/package/create', form);
  },

  deploy: async (
    name: string,
    env: EnvVar[],
    plan: Plans,
    resourceType: ResourceType,
  ): Promise<{ suffix: string; prefix: string; version: string }> => {
    return _post<{ suffix: string; prefix: string; version: string }>(
      '/api/deploy/create',
      { suffix: name, resourceType, release: name, env, plan, version: 'v1' },
    );
  },

  deployDelete: async (prefix: string, suffix: string, version: string): Promise<void> => {
    await _post('/api/deploy/delete', { prefix, suffix, version });
  },

  logs: async (
    suffix: string,
    prefix: string,
    type: 'deploy' | 'job' = 'deploy',
    signal?: AbortSignal,
  ): Promise<string> => {
    return _post<string>('/api/deploy/logs', { suffix, prefix, type }, { signal });
  },

  call: async <R>(
    prefix: string,
    suffix: string,
    version: string,
    name: string,
    args: unknown[] = [],
  ): Promise<R> => {
    return _post<R>(`/${prefix}/${suffix}/${version}/call/${name}`, args);
  },

  branchList: async (url: string): Promise<string[]> => {
    const res = await _post<{ branches: string[] }>('/api/repository/branchlist', { url });
    return res.branches;
  },

  add: async (url: string, branch: string): Promise<{ id: string }> => {
    return _post<{ id: string }>('/api/repository/add', { url, branch, jsons: [] });
  },

  login: async (email: string, password: string): Promise<string> => {
    try {
      const data = await _post<{ token?: string; error?: string }>('/api/auth/login', {
        email,
        password,
      });
      if (!data.token) throw new Error(data.error ?? 'Login failed. Please try again.');
      return data.token;
    } catch (err) {
      extractError(err, 'Login failed. Please try again.');
    }
  },

  signup: async (email: string, password: string, alias: string): Promise<string> => {
    try {
      const data = await _post<{ token?: string; error?: string }>('/api/auth/signup', {
        email,
        password,
        alias,
      });
      if (!data.token) throw new Error(data.error ?? 'Signup failed. Please try again.');
      return data.token;
    } catch (err) {
      extractError(err, 'Signup failed. Please try again.');
    }
  },
};
