/**
 * global-teardown.ts
 *
 * Runs once after the entire Playwright test suite completes.
 * Resets the auth.json storageState back to an unauthenticated empty state
 * so the repository is clean after test runs (no committed secrets).
 */

import type { FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_STATE_PATH = path.join(import.meta.dirname, '..', 'storage', 'auth.json');

const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] }, null, 2);

async function globalTeardown(_config: FullConfig): Promise<void> {
  try {
    fs.writeFileSync(AUTH_STATE_PATH, EMPTY_STATE);
    console.log('[global-teardown] Auth state cleared.');
  } catch {
    // Non-fatal — file may not exist in CI environments
  }
}

export default globalTeardown;
