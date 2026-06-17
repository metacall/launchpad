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
import loginFn from '@metacall/protocol/login';
import signupFn from '@metacall/protocol/signup';
import type { API, Resource } from '@metacall/protocol';
import type { Deployment, MetaCallJSON, Plans } from '@/shared/types';

const TOKEN_KEY = 'faas_token';

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    if (init && init.method === 'POST' && (urlStr.includes('/login') || urlStr.includes('/signup'))) {
      try {
        if (typeof init.body === 'string') {
          const bodyObj = JSON.parse(init.body) as Record<string, unknown>;
          if (!bodyObj['g-recaptcha-response']) {
            bodyObj['g-recaptcha-response'] = 'empty';
            init = {
              ...init,
              body: JSON.stringify(bodyObj)
            };
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    const res = await originalFetch.call(this, input, init);
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
      } catch (e) {
        // Ignore
      }
    }
    if (res.ok && urlStr.includes('/api/deploy/logs')) {
      try {
        const cloned = res.clone();
        await cloned.json();
      } catch (jsonErr) {
        try {
          const text = await res.text();
          const jsonString = JSON.stringify(text);
          return new Response(jsonString, {
            status: res.status,
            statusText: res.statusText,
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          });
        } catch (e) {
          // Ignore
        }
      }
    }
    return res;
  };
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
      return await getProtocol().logs(container, logType, suffix, prefix);
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
      return await getProtocol().call<R>(prefix, suffix, version, name, args);
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
      const token = await loginFn(email, password, BASE_URL);
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
      const token = await signupFn(email, password, alias, BASE_URL);
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
