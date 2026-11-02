/**
 * runtime.ts
 *
 * Optional runtime configuration served by the `@metacall/launchpad` wrapper at
 * `/__launchpad/config`. It lets one prebuilt Dashboard bundle point at a local
 * FaaS instance without rebuilding it with different `VITE_*` variables.
 *
 * Expected shape (every field optional):
 *   { "faasUrl": "http://localhost:9000", "token": "local", "mode": "local" }
 *
 * If the endpoint is missing, slow, unreachable or returns anything that is not
 * a JSON object, the config stays empty and every consumer falls back to its
 * build-time behavior. The probe is skipped entirely on the hosted dashboard.
 */

import { LS_TOKEN_KEY } from '@/shared/constants';

export const RUNTIME_CONFIG_PATH = '/__launchpad/config';
export const RUNTIME_CONFIG_TIMEOUT_MS = 2000;
export const LOCAL_MODE_TOKEN = 'local';

export type RuntimeMode = 'local' | 'hosted';

export interface RuntimeConfig {
  faasUrl?: string;
  token?: string;
  mode?: RuntimeMode;
}

let runtimeConfig: RuntimeConfig = {};

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}

export function isLocalMode(): boolean {
  return runtimeConfig.mode === 'local';
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function parseFaasUrl(value: unknown): string | undefined {
  const raw = nonEmptyString(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  } catch {
    return undefined;
  }
  return raw.replace(/\/+$/, '');
}

/** Keep only the fields we understand; ignore anything malformed. */
export function parseRuntimeConfig(raw: unknown): RuntimeConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const config: RuntimeConfig = {};

  const faasUrl = parseFaasUrl(obj['faasUrl']);
  if (faasUrl) config.faasUrl = faasUrl;

  const token = nonEmptyString(obj['token']);
  if (token) config.token = token;

  if (obj['mode'] === 'local' || obj['mode'] === 'hosted') config.mode = obj['mode'];

  return config;
}

/** Fetch the runtime config. Never throws; resolves to `{}` on any failure. */
export async function loadRuntimeConfig(
  timeoutMs: number = RUNTIME_CONFIG_TIMEOUT_MS,
): Promise<RuntimeConfig> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(RUNTIME_CONFIG_PATH, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    // SPA hosts often answer unknown paths with index.html, so require JSON.
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) {
      return {};
    }
    return parseRuntimeConfig(await res.json());
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Store the config for the rest of the app. In local mode, seed the `'local'`
 * token (the same one `metacall deploy --dev` uses) unless a token already
 * exists, so a real login is never overwritten.
 */
export function applyRuntimeConfig(config: RuntimeConfig): void {
  runtimeConfig = config;
  if (config.mode !== 'local') return;
  try {
    if (!localStorage.getItem(LS_TOKEN_KEY)) {
      localStorage.setItem(LS_TOKEN_KEY, config.token ?? LOCAL_MODE_TOKEN);
    }
  } catch {
    // Storage unavailable (e.g. blocked by the browser); the in-memory token still applies.
  }
}

/**
 * Startup step: run once in main.tsx before the app renders. Skipped on the
 * hosted dashboard so its startup does not change at all.
 */
export async function initRuntimeConfig(
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
): Promise<void> {
  if (origin.includes('dashboard.metacall.io')) return;
  applyRuntimeConfig(await loadRuntimeConfig());
}
