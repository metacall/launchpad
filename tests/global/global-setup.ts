import type { FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig): Promise<void> {
  // Intentionally minimal; reserved for future environment/bootstrap logic.
}

export default globalSetup;
