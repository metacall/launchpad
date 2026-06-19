/**
 * dashboard.smoke.spec.ts
 *
 * Smoke tests for the main Dashboard page (/).
 * These tests run WITH the pre-seeded auth storageState (from global-setup.ts),
 * so the app sees the user as authenticated and renders the dashboard directly.
 *
 * API calls are intercepted to return empty data so tests are deterministic
 * and do not require a live MetaCall server.
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/dashboard.page';

// Mock all MetaCall API calls so tests don't depend on a live server
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/dashboard.metacall.io/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
});

test.describe('Dashboard Smoke', () => {
  test('dashboard page loads for authenticated user', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Must NOT redirect to /login
    await expect(page).toHaveURL('/');
  });

  test('dashboard displays the Launchpads section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // The Launchpads heading must be visible (use heading role to avoid strict mode violations)
    await expect(page.getByRole('heading', { name: 'Launchpads' })).toBeVisible();
  });

  test('dashboard renders the MetaCall logo in the navbar', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.logo).toBeVisible();
  });

  test('dashboard page has at least one heading', async ({ page }) => {
    await page.goto('/');
    const headings = page.getByRole('heading');
    await expect(headings.first()).toBeVisible();
  });

  test('dashboard body renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root, #app, body > div').first()).toBeVisible();
  });
});
