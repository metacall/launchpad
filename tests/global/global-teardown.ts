import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig): Promise<void> {
  // Intentionally minimal; reserved for future cleanup logic.
}

export default globalTeardown;
