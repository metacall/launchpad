import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

type AuthFixtures = {
  authenticatedPage: ReturnType<typeof base.prototype>;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Note: Storage-state configuration will replace direct login in future phases
    await use(page);
  },
});

export { expect } from '@playwright/test';
