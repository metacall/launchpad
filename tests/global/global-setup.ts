/**
 * global-setup.ts
 *
 * Runs once before the entire Playwright test suite. Writes a pre-seeded
 * auth storageState so all protected-route tests start already authenticated
 * without executing a real login flow against the MetaCall API.
 *
 * The injected token is a mock value; protected pages check only for the
 * presence of `faas_token` in localStorage to decide whether the user is
 * authenticated (see useAuth.tsx). API calls that require a valid token
 * are intercepted per-test via `page.route()`.
 */

import type { FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_STATE_PATH = path.join(import.meta.dirname, '..', 'storage', 'auth.json');

const MOCK_TOKEN = 'mock-test-jwt-token-for-playwright-e2e';
const MOCK_EMAIL = 'playwright-test@metacall.io';

/** Shape expected by Playwright's storageState */
interface StorageState {
  cookies: unknown[];
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ?? _config.projects[0]?.use?.baseURL ?? 'http://localhost:5173';

  const state: StorageState = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [
          { name: 'faas_token', value: MOCK_TOKEN },
          { name: 'faas_user_email', value: MOCK_EMAIL },
        ],
      },
    ],
  };

  // Ensure the storage directory exists before writing
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2));

  console.log(`[global-setup] Auth state written → ${AUTH_STATE_PATH}`);
  console.log(`[global-setup] Mock token: ${MOCK_TOKEN.slice(0, 20)}…`);
  console.log(`[global-setup] Mock email: ${MOCK_EMAIL}`);
}

export default globalSetup;
