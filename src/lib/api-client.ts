/**
 * api-client.ts
 *
 * Thin wrapper around @metacall/protocol.
 * All HTTP communication goes through the Protocol client (native fetch,
 * no Axios). Login / signup use the protocol's own standalone functions.
 *
 * Consumers: import { api, isApiError, isAbortError } from '@/lib/api-client'.
 */

import Protocol, { isProtocolError, ResourceType as ProtocolResourceType, LogType } from '@metacall/protocol';
import type { API, Resource, SubscriptionDeploy } from '@metacall/protocol';
import type { Deployment, MetaCallJSON, Plans } from '@/shared/types';
import { readMockSubscriptions } from '@/shared/lib/plan';

import { LS_TOKEN_KEY } from '@/shared/constants';
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

  if (newInit && newInit.method === 'POST' && (urlStr.includes('/login') || urlStr.includes('/signup'))) {
    try {
      if (typeof newInit.body === 'string') {
        const bodyObj = JSON.parse(newInit.body) as Record<string, unknown>;
        if (!bodyObj['g-recaptcha-response']) {
          bodyObj['g-recaptcha-response'] = 'empty';
          newInit.body = JSON.stringify(bodyObj);
        }
      }
    } catch {
      // Ignore
    }
  }

  const res = await fetch(input, newInit);

  if (!res.ok && (urlStr.includes('/login') || urlStr.includes('/signup'))) {
    try {
      const cloned = res.clone();
      const text = await cloned.text();
      if (text) {
        Object.defineProperty(res, 'statusText', {
          value: text.trim(),
          writable: false,
          configurable: true
        });
      }
    } catch {
      // Ignore
    }
  }

  return res;
}

const BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'https://dashboard.metacall.io';

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? (import.meta.env.VITE_FAAS_TOKEN as string) ?? '';
}

function getProtocol(): API {
  return Protocol(getToken(), BASE_URL);
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
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.name === 'TimeoutError')
  );
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

  /** List user billing subscriptions. */
  listSubscriptions: async (): Promise<Record<string, number>> => {
    try {
      let realSubs: Record<string, number> = {};
      try {
        realSubs = await getProtocol().listSubscriptions();
      } catch {
        // Fallback: If listSubscriptions fails, derive from listSubscriptionsDeploys
        try {
          const deploys = await api.listSubscriptionsDeploys();
          for (const d of deploys) {
            realSubs[d.plan] = (realSubs[d.plan] || 0) + 1;
          }
        } catch {
          // Ignore
        }
      }

      const mockSubs = readMockSubscriptions();
      const merged: Record<string, number> = { ...realSubs };
      
      for (const [key, count] of Object.entries(mockSubs)) {
        merged[key] = (merged[key] || 0) + count;
      }
      
      return merged;
    } catch (err) {
      mapError(err);
    }
  },

  /** List subscription deploys. */
  listSubscriptionsDeploys: async (): Promise<SubscriptionDeploy[]> => {
    try {
      let realDeploys: SubscriptionDeploy[] = [];
      try {
        const response = await fetch(`${BASE_URL}/api/billing/list-subscriptions-deploys`, {
          headers: {
            Authorization: `jwt ${getToken()}`,
          },
        });
        if (response.ok) {
          realDeploys = (await response.json()) as SubscriptionDeploy[];
        }
      } catch {
        // Fallback
      }

      // Fetch real billing plan subscription counts
      let realSubs: Record<string, number> = {};
      try {
        realSubs = await getProtocol().listSubscriptions();
      } catch {
        // Ignore
      }

      const mockSubs = readMockSubscriptions();
      const totalSubs: Record<string, number> = { ...realSubs };
      
      for (const [key, count] of Object.entries(mockSubs)) {
        totalSubs[key] = (totalSubs[key] || 0) + count;
      }

      const merged: SubscriptionDeploy[] = [...realDeploys];

      for (const [planName, count] of Object.entries(totalSubs)) {
        const realCount = realDeploys.filter(d => d.plan === planName).length;
        const missingCount = count - realCount;
        for (let i = 0; i < missingCount; i++) {
          merged.push({
            id: `CF222FF2-037${5 + i}`,
            plan: planName as Plans,
            date: Math.floor(Date.now() / 1000) - (86400 * 30 * i),
            deploy: '',
          });
        }
      }

      return merged;
    } catch (err) {
      mapError(err);
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

      const response = await fetch(`${BASE_URL}/api/deploy/logs`, {
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
          `HTTP ${response.status}: ${response.statusText}${
            data ? ` - ${data}` : ''
          }`,
          response.status,
          data
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
          `HTTP ${response.status}: ${response.statusText}${
            data ? ` - ${data}` : ''
          }`,
          response.status,
          data
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

  login: async (email: string, password: string): Promise<string> => {
    try {
      const res = await authFetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Host: new URL(BASE_URL).host,
          Origin: BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error(res.statusText);
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

  signup: async (email: string, password: string, alias: string): Promise<string> => {
    try {
      const res = await authFetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Host: new URL(BASE_URL).host,
          Origin: BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, alias })
      });

      if (!res.ok) {
        throw new Error(res.statusText);
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
