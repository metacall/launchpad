import axios, { type AxiosError } from 'axios';
import type { Deployment, Plans } from '@/shared/types';

const BASE_URL = (import.meta.env.VITE_FAAS_URL as string | undefined) ?? '';
const TOKEN_KEY = 'faas_token';

function getToken(): string {
  // Only use the token the user explicitly received from login/signup.
  // We intentionally do NOT fall back to VITE_FAAS_TOKEN so that
  // every session must go through the login flow.
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function extractError(err: unknown, fallback: string): never {
  const serverMsg = (err as AxiosError<{ error?: string }>).response?.data?.error;
  throw new Error(serverMsg ?? (err instanceof Error ? err.message : fallback));
}

const http = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

http.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  res => res,
  err => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const onAuthPage =
        window.location.pathname === '/login' || window.location.pathname === '/signup';
      if (!onAuthPage) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export interface EnvVar {
  name: string;
  value: string;
}

export type ResourceType = 'Package' | 'Repository';

export const api = {
  ready: async (signal?: AbortSignal): Promise<boolean> => {
    try {
      const res = await http.get<unknown>('/api/readiness', { signal });
      return res.status === 200;
    } catch {
      return false;
    }
  },

  inspect: async (signal?: AbortSignal): Promise<Deployment[]> => {
    const res = await http.get<Deployment[]>('/api/inspect', { signal });
    return res.data;
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
    const res = await http.post<string>('/api/package/create', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deploy: async (
    name: string,
    env: EnvVar[],
    plan: Plans,
    resourceType: ResourceType,
  ): Promise<{ suffix: string; prefix: string; version: string }> => {
    const res = await http.post<{ suffix: string; prefix: string; version: string }>(
      '/api/deploy/create',
      {
        suffix: name,
        resourceType,
        release: name,
        env,
        plan,
        version: 'v1',
      },
    );
    return res.data;
  },

  deployDelete: async (prefix: string, suffix: string, version: string): Promise<void> => {
    await http.post('/api/deploy/delete', { prefix, suffix, version });
  },

  logs: async (
    suffix: string,
    prefix: string,
    type: 'deploy' | 'job' = 'deploy',
    signal?: AbortSignal,
  ): Promise<string> => {
    const res = await http.post<string>('/api/deploy/logs', { suffix, prefix, type }, { signal });
    return res.data;
  },

  call: async <R>(
    prefix: string,
    suffix: string,
    version: string,
    name: string,
    args: unknown[] = [],
  ): Promise<R> => {
    const res = await http.post<R>(`/${prefix}/${suffix}/${version}/call/${name}`, args);
    return res.data;
  },

  branchList: async (url: string): Promise<string[]> => {
    const res = await http.post<{ branches: string[] }>('/api/repository/branchlist', { url });
    return res.data.branches;
  },

  add: async (url: string, branch: string): Promise<{ id: string }> => {
    const res = await http.post<{ id: string }>('/api/repository/add', { url, branch, jsons: [] });
    return res.data;
  },

  login: async (email: string, password: string): Promise<string> => {
    try {
      const res = await http.post<{ token?: string; error?: string }>('/api/auth/login', { email, password });
      if (!res.data.token) throw new Error(res.data.error ?? 'Login failed. Please try again.');
      return res.data.token;
    } catch (err) {
      extractError(err, 'Login failed. Please try again.');
    }
  },

  signup: async (email: string, password: string, alias: string): Promise<string> => {
    try {
      const res = await http.post<{ token?: string; error?: string }>('/api/auth/signup', { email, password, alias });
      if (!res.data.token) throw new Error(res.data.error ?? 'Signup failed. Please try again.');
      return res.data.token;
    } catch (err) {
      extractError(err, 'Signup failed. Please try again.');
    }
  },
};
