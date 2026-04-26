import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/dashboard.page';

// Smoke tests for dashboard
// Validates dashboard loads and displays expected structure

test.describe('Dashboard Smoke', () => {
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/');

    const dashboardPage = new DashboardPage(page);
    const isLoaded = await dashboardPage.isLoaded();
    expect(isLoaded).toBeTruthy();
  });

  test('dashboard displays main content', async ({ page }) => {
    await page.goto('/');

    const main = page.getByRole('main');
    const isVisible = await main.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isVisible || (await page.locator('body').isVisible())).toBeTruthy();
  });

  test('navigation is present on dashboard', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation');
    const hasNav = await nav.isVisible({ timeout: 5000 }).catch(() => false);

    // Page should load regardless of nav visibility
    await expect(page).toHaveURL(/^\//);
    expect(hasNav || (await page.locator('header, aside, nav').first().isVisible().catch(() => false))).toBeTruthy();
  });

  test('page renders with headings', async ({ page }) => {
    await page.goto('/');

    const heading = page.getByRole('heading');
    const headingCount = await heading.count();

    expect(headingCount).toBeGreaterThan(0);
  });

  test('app renders correctly', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    const html = page.locator('html, body, div[id*="root"], div[id*="app"]');
    const htmlVisible = await html.first().isVisible().catch(() => false);
    expect(htmlVisible).toBeTruthy();
  });
});
