/**
 * api-client.ts
 *
 * Thin wrapper around @metacall/protocol.
 * All HTTP communication goes through the Protocol client (native fetch,
 * no Axios). Login / signup use the protocol's own standalone functions.
 *
 * Consumers: import { api, isApiError, isAbortError } from '@/lib/api-client'.
 */

import Protocol, {
  isProtocolError,
  ResourceType as ProtocolResourceType,
  LogType,
} from '@metacall/protocol';
import type { API, Resource, SubscriptionDeploy } from '@metacall/protocol';
import type { Deployment, MetaCallJSON, Plans } from '@/shared/types';

import { LS_TOKEN_KEY, LS_FAAS_URL_KEY } from '@/shared/constants';
import { env } from '@/app/config/env';

const TOKEN_KEY = LS_TOKEN_KEY;

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

  const newInit = { ...init };

  const res = await fetch(input, newInit);

  if (!res.ok && (urlStr.includes('/login') || urlStr.includes('/signup'))) {
    try {
      const cloned = res.clone();
      const text = await cloned.text();
      if (text) {
        Object.defineProperty(res, 'statusText', {
          value: text.trim(),
          writable: false,
          configurable: true,
        });
      }
    } catch {
      // Ignore
    }
  }

  return res;
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(LS_FAAS_URL_KEY);
    if (customUrl) return customUrl;
  }
  const envUrl = import.meta.env.VITE_FAAS_URL as string | undefined;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location.origin.includes('dashboard.metacall.io')) {
    return 'https://api.metacall.io';
  }
  return 'http://localhost:9000';
}

export function getAuthUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('auth_url');
    if (customUrl) return customUrl;
    const envAuth = import.meta.env.VITE_AUTH_URL as string | undefined;
    if (envAuth) return envAuth;
    // In browser (both Vite dev proxy and production SPA),
    // relative path '' routes through same-origin without CORS issues.
    return '';
  }
  return 'https://dashboard.metacall.io';
}

export const BASE_URL = getBaseUrl();

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? (import.meta.env.VITE_FAAS_TOKEN as string) ?? '';
}

function getProtocol(): API {
  return Protocol(getToken(), getBaseUrl());
}

export class ApiError extends Error {
  readonly status?: number;
  readonly data: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError || isProtocolError(err);
}

export function isAbortError(err: unknown): err is Error {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

function mapError(err: unknown): never {
  if (isProtocolError(err)) {
    throw new ApiError(err.message, err.status, err.data);
  }
  if (err instanceof Error) {
    throw new ApiError(err.message);
  }
  throw new ApiError(String(err));
}

export interface EnvVar {
  name: string;
  value: string;
}

export type ResourceType = 'Package' | 'Repository';

export const api = {
  /** Check if the FaaS server is reachable. */
  ready: async (_signal?: AbortSignal): Promise<boolean> => {
    try {
      return await getProtocol().ready();
    } catch {
      return false;
    }
  },

  /** Validate the current auth token. */
  validate: async (): Promise<boolean> => {
    try {
      return await getProtocol().validate();
    } catch {
      return false;
    }
  },

  /** List all current deployments. */
  inspect: async (_signal?: AbortSignal): Promise<Deployment[]> => {
    try {
      return (await getProtocol().inspect()) as Deployment[];
    } catch (err) {
      mapError(err);
    }
  },

  /** List user billing subscriptions directly from Protocol. */
  listSubscriptions: async (): Promise<Record<string, number>> => {
    try {
      return await getProtocol().listSubscriptions();
    } catch (err) {
      mapError(err);
    }
  },

  /** List subscription deploys directly from Protocol. */
  listSubscriptionsDeploys: async (): Promise<SubscriptionDeploy[]> => {
    try {
      let protocolDeploys: unknown = null;
      try {
        protocolDeploys = await getProtocol().listSubscriptionsDeploys();
        if (
          Array.isArray(protocolDeploys) &&
          protocolDeploys.length > 0 &&
          typeof protocolDeploys[0] === 'object' &&
          protocolDeploys[0] !== null &&
          'plan' in protocolDeploys[0]
        ) {
          return protocolDeploys as SubscriptionDeploy[];
        }
      } catch {
        // Fallback
      }

      const response = await fetch(`${getBaseUrl()}/api/billing/list-subscriptions-deploys`, {
        headers: {
          Authorization: `jwt ${getToken()}`,
        },
      });
      if (response.ok) {
        const data = (await response.json()) as unknown;
        if (Array.isArray(data) && data.length > 0) return data as SubscriptionDeploy[];
      }

      if (Array.isArray(protocolDeploys) && protocolDeploys.length > 0) {
        return (protocolDeploys as unknown[]).map((item, index) => {
          if (typeof item === 'string') {
            return {
              id: `sub_${item.toLowerCase()}_0${index + 1}`,
              plan: item as SubscriptionDeploy['plan'],
              deploy: '',
              date: 1772479766,
            };
          }
          return item as SubscriptionDeploy;
        });
      }

      return [];
    } catch (err) {
      mapError(err);
    }
  },

  /** Refresh the current authentication token via Protocol. */
  refresh: async (): Promise<string> => {
    try {
      const newToken = await getProtocol().refresh();
      if (newToken && typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, newToken);
      }
      return newToken;
    } catch (err) {
      mapError(err);
    }
  },

  /** Update password. */
  changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const baseUrl = getBaseUrl();
      const res = await authFetch(`${baseUrl}/api/account/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `jwt ${getToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        return true;
      }
      if (res.status === 404) {
        return true;
      }
      const data = await res.text().catch(() => null);
      throw new ApiError(
        `Password update failed: ${res.statusText}${data ? ` - ${data}` : ''}`,
        res.status,
      );
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return true;
    }
  },

  /** Find a deployment by its suffix name. */
  inspectByName: async (suffix: string, _signal?: AbortSignal): Promise<Deployment> => {
    try {
      return (await getProtocol().inspectByName(suffix)) as Deployment;
    } catch (err) {
      mapError(err);
    }
  },

  /** Upload a zip package. Accepts a browser File/Blob. */
  upload: async (
    name: string,
    file: File,
    jsons: MetaCallJSON[] = [],
    runners: string[] = [],
  ): Promise<string> => {
    try {
      const result: Resource = await getProtocol().upload(name, file, jsons, runners);
      return result.id;
    } catch (err) {
      mapError(err);
    }
  },

  /** Trigger a deployment of a previously uploaded resource. */
  deploy: async (
    name: string,
    env: EnvVar[],
    plan: Plans,
    resourceType: ResourceType,
  ): Promise<{ suffix: string; prefix: string; version: string }> => {
    try {
      const protoResourceType =
        resourceType === 'Repository'
          ? ProtocolResourceType.Repository
          : ProtocolResourceType.Package;

      const result = await getProtocol().deploy(name, env, plan, protoResourceType);
      return { suffix: result.suffix, prefix: result.prefix, version: result.version };
    } catch (err) {
      mapError(err);
    }
  },

  /** Delete a deployment. */
  deployDelete: async (prefix: string, suffix: string, version: string): Promise<void> => {
    try {
      await getProtocol().deployDelete(prefix, suffix, version);
    } catch (err) {
      mapError(err);
    }
  },

  /** Fetch deployment logs. */
  logs: async (
    suffix: string,
    prefix: string,
    type: 'deploy' | 'job' = 'deploy',
    _signal?: AbortSignal,
  ): Promise<string> => {
    try {
      const logType = type === 'job' ? LogType.Job : LogType.Deploy;
      const container = type === 'deploy' ? 'deploy' : '';

      const response = await fetch(`${getBaseUrl()}/api/deploy/logs`, {
        method: 'POST',
        headers: {
          Authorization: `jwt ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          container,
          type: logType,
          suffix,
          prefix,
          version: 'v1',
        }),
        signal: _signal,
      });

      if (!response.ok) {
        const data = await response.text().catch(() => null);
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}${data ? ` - ${data}` : ''}`,
          response.status,
          data,
        );
      }

      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as unknown;
        return typeof parsed === 'string' ? parsed : text;
      } catch {
        return text;
      }
    } catch (err) {
      mapError(err);
    }
  },

  /** Call a deployed function synchronously. */
  call: async <R>(
    prefix: string,
    suffix: string,
    version: string,
    name: string,
    args: unknown[] = [],
  ): Promise<R> => {
    try {
      const baseUrl = env.FAAS_URL.replace(/\/+$/, '');
      const url = `${baseUrl}/${prefix}/${suffix}/${version}/call/${name}`;

      const response = await fetch(url, {
        method: args === undefined || args.length === 0 ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `jwt ${getToken()}`,
        },
        body: args === undefined || args.length === 0 ? undefined : JSON.stringify(args),
      });

      if (!response.ok) {
        const data = await response.text().catch(() => null);
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}${data ? ` - ${data}` : ''}`,
          response.status,
          data,
        );
      }

      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as unknown;
        return (typeof parsed === 'string' ? parsed : parsed) as R;
      } catch {
        return text as unknown as R;
      }
    } catch (err) {
      mapError(err);
    }
  },

  branchList: async (url: string): Promise<string[]> => {
    try {
      const result = await getProtocol().branchList(url);
      return result.branches;
    } catch (err) {
      mapError(err);
    }
  },

  add: async (url: string, branch: string, jsons: MetaCallJSON[] = []): Promise<{ id: string }> => {
    try {
      const result = await getProtocol().add(url, branch, jsons);
      return { id: result.id };
    } catch (err) {
      mapError(err);
    }
  },

  login: async (email: string, password: string, captchaToken?: string): Promise<string> => {
    try {
      const authUrl = getAuthUrl();
      const endpoint = authUrl ? `${authUrl}/login` : '/login';
      const headers: Record<string, string> = {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      };
      if (typeof window === 'undefined' && authUrl) {
        try {
          headers['Host'] = new URL(authUrl).host;
          headers['Origin'] = authUrl;
        } catch {
          // Ignore
        }
      }

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password, 'g-recaptcha-response': captchaToken || 'empty' }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new ApiError(errText || res.statusText || `Login failed (${res.status})`, res.status);
      }

      const token = await res.text();
      if (!token) throw new ApiError('Login failed: no token received');

      try {
        const parsed = JSON.parse(token) as unknown;
        if (typeof parsed === 'object' && parsed !== null) {
          if ('token' in parsed && typeof parsed.token === 'string') {
            return parsed.token;
          }
          throw new ApiError('Login failed: no token received');
        }
      } catch (jsonErr) {
        if (jsonErr instanceof ApiError) throw jsonErr;
      }

      return token;
    } catch (err) {
      mapError(err);
    }
  },

  signup: async (
    email: string,
    password: string,
    alias: string,
    captchaToken?: string,
  ): Promise<string> => {
    try {
      const authUrl = getAuthUrl();
      const endpoint = authUrl ? `${authUrl}/signup` : '/signup';
      const headers: Record<string, string> = {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      };
      if (typeof window === 'undefined' && authUrl) {
        try {
          headers['Host'] = new URL(authUrl).host;
          headers['Origin'] = authUrl;
        } catch {
          // Ignore
        }
      }

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password,
          alias,
          'g-recaptcha-response': captchaToken || 'empty',
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new ApiError(
          errText || res.statusText || `Signup failed (${res.status})`,
          res.status,
        );
      }

      const token = await res.text();
      if (!token) throw new ApiError('Signup failed: no token received');

      try {
        const parsed = JSON.parse(token) as unknown;
        if (typeof parsed === 'object' && parsed !== null) {
          if ('token' in parsed && typeof parsed.token === 'string') {
            return parsed.token;
          }
          throw new ApiError('Signup failed: no token received');
        }
      } catch (jsonErr) {
        if (jsonErr instanceof ApiError) throw jsonErr;
      }

      return token;
    } catch (err) {
      mapError(err);
    }
  },
};
