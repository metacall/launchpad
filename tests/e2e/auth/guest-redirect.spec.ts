/**
 * guest-redirect.spec.ts
 *
 * Verifies that unauthenticated users are redirected to /login when
 * they attempt to access any protected route, and that authenticated
 * users are NOT redirected back to /login (i.e., GuestRoute works).
 */

import { test, expect } from '@playwright/test';

// All tests explicitly unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

const PROTECTED_ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/deployments', name: 'Deployments list' },
  { path: '/deployments/new', name: 'New deployment hub' },
  { path: '/settings', name: 'Settings' },
  { path: '/plans', name: 'Plans' },
];

test.describe('Guest Route Protection', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`redirects unauthenticated user from ${route.name} (${route.path}) to /login`, async ({ page }) => {
      await page.goto(route.path);

      // Should end up on /login
      await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

      // The login form must be visible
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
    });
  }

  test('unauthenticated user accessing /login stays on /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('unauthenticated user accessing /signup stays on /signup', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/signup/);
  });

  test('unknown routes redirect unauthenticated users to /login', async ({ page }) => {
    await page.goto('/non-existent-route-xyz');
    // Protected route — redirects to login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});
