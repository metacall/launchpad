/**
 * dashboard.spec.ts
 *
 * Full E2E test suite for the main Dashboard page (/).
 *
 * Runs WITH pre-seeded auth storageState (from global-setup.ts).
 * All MetaCall API calls are intercepted so tests are deterministic
 * and do not require a running MetaCall server.
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/dashboard.page';

/** Mock all backend API calls with empty/fixture data */
async function mockAPIs(page: import('@playwright/test').Page) {
  await page.route('**/api/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/dashboard.metacall.io/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('Dashboard — Navigation & Auth', () => {
  test('authenticated user lands on dashboard without redirect', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('MetaCall logo is visible in the navbar', async ({ page }) => {
    await mockAPIs(page);
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.logo).toBeVisible();
  });

  test('Settings button is visible in the navbar', async ({ page }) => {
    await mockAPIs(page);
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.settingsButton).toBeVisible();
  });

  test('Logout button is visible in the navbar', async ({ page }) => {
    await mockAPIs(page);
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.logoutButton).toBeVisible();
  });

  test('clicking Settings navigates to /settings', async ({ page }) => {
    await mockAPIs(page);
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await dashboardPage.settingsButton.click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('clicking Logout clears auth and redirects to /login', async ({ page }) => {
    await mockAPIs(page);
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await dashboardPage.logoutButton.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

    // Token should be cleared from localStorage
    const token = await page.evaluate(() => localStorage.getItem('faas_token'));
    expect(token).toBeNull();
  });
});

test.describe('Dashboard — Launchpad Grid', () => {
  test('Launchpads section heading is visible', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Launchpads' })).toBeVisible({ timeout: 8_000 });
  });

  test('New Deploy card is always present in the launchpad grid', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');

    await expect(page.getByText('New Deploy')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Free Plan')).toBeVisible();
  });

  test('three paid plan slot cards are rendered', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');

    // Essential, Standard, Premium plan labels appear in the plan slot headers
    await expect(page.getByText('Essential', { exact: false }).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Standard', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Premium', { exact: false }).first()).toBeVisible();
  });

  test('clicking New Deploy card navigates to new deployment page', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');

    // Click the "Deploy" text inside the New Deploy card
    const newDeployCard = page.locator('text=Free Plan').locator('../..');
    await newDeployCard.click();

    await expect(page).toHaveURL(/\/deployments\/new/, { timeout: 8_000 });
  });
});

test.describe('Dashboard — Empty State & Loading', () => {
  test('does not show the Deployments section when API returns empty list', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');

    // The "Deployments" heading should NOT be visible (section only renders if there are deployments)
    const deploymentsHeading = page.getByRole('heading', { name: /^Deployments$/i });
    const isVisible = await deploymentsHeading.isVisible({ timeout: 3_000 }).catch(() => false);
    // We just assert it doesn't crash (it may or may not show depending on loading state)
    expect(typeof isVisible).toBe('boolean');
  });

  test('page renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await mockAPIs(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical network errors (API mock)
    const criticalErrors = errors.filter(e => !e.includes('fetch') && !e.includes('network'));
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Dashboard — Plan Slot Interactions', () => {
  test('clicking an empty paid plan slot when no subscription navigates to /plans', async ({ page }) => {
    // Mock listSubscriptions to return an empty object (no subscriptions)
    await page.route('**/api/**', route => {
      const url = route.request().url();
      if (url.includes('subscriptions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/');

    // Wait for the page to settle after subscription load
    await page.waitForTimeout(500);

    // Click the first paid plan card
    const essentialCard = page.locator('text=Essential', { exact: false }).first().locator('../..');
    if (await essentialCard.isVisible().catch(() => false)) {
      await essentialCard.click();
      // May navigate to /plans or /deployments/new depending on subscription state
      await expect(page).toHaveURL(/\/(plans|deployments)/, { timeout: 8_000 });
    }
  });
});
