/**
 * plans.spec.ts
 *
 * Full E2E test suite for the Plans / Pricing page (/plans).
 *
 * Runs WITH pre-seeded auth storageState (from global-setup.ts).
 */

import { test, expect } from '@playwright/test';
import { PlansPage } from '../../pages/plans.page';

async function mockAPIs(page: import('@playwright/test').Page) {
  await page.route('**/api/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/dashboard.metacall.io/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('Plans Page — Layout & Structure', () => {
  test('renders the Plans page heading', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(plansPage.heading).toBeVisible();
  });

  test('renders the subheading description', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(page.getByText(/Scale effortlessly/i)).toBeVisible();
  });

  test('Back button is present', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  });

  test('Back button navigates away from the plans page', async ({ page }) => {
    await mockAPIs(page);

    // Navigate to plans from dashboard so there's history to go back to
    await page.goto('/');
    await page.goto('/plans');

    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.waitFor({ state: 'visible' });
    await backButton.click();

    // Should navigate back (to dashboard or wherever we came from)
    await expect(page).not.toHaveURL(/\/plans/);
  });
});

test.describe('Plans Page — Plan Cards', () => {
  test('renders the Essential Plan card', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(page.getByText('Essential Plan')).toBeVisible();
  });

  test('renders the Standard Plan card', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(page.getByText('Standard Plan')).toBeVisible();
  });

  test('renders the Premium Plan card', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(page.getByText('Premium Plan')).toBeVisible();
  });

  test('Essential Plan shows correct price', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/plans');

    // The price is rendered as "€10/MO"
    await expect(page.getByText('€10', { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('Standard Plan shows correct price', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/plans');

    await expect(page.getByText('€29', { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('Premium Plan shows correct price', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/plans');

    await expect(page.getByText('€80', { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('each plan has a Select button', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await expect(plansPage.selectEssentialButton).toBeVisible();
    await expect(plansPage.selectStandardButton).toBeVisible();
    await expect(plansPage.selectPremiumButton).toBeVisible();
  });

  test('plan features list items are rendered', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/plans');

    await expect(page.getByText('Unlimited Functions').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Unlimited Builds').first()).toBeVisible();
  });
});

test.describe('Plans Page — Checkout Modal', () => {
  test('clicking Select Essential opens the checkout modal', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectEssentialButton.click();

    await expect(plansPage.checkoutHeading).toBeVisible({ timeout: 5_000 });
  });

  test('checkout modal shows the selected plan name', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectEssentialButton.click();

    await expect(page.getByText('Essential Plan', { exact: false }).last()).toBeVisible({ timeout: 5_000 });
  });

  test('checkout modal shows the Subscribe button', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectEssentialButton.click();
    await expect(plansPage.subscribeButton).toBeVisible({ timeout: 5_000 });
  });

  test('checkout modal shows payment fields', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectEssentialButton.click();

    await expect(page.getByPlaceholder('Card number')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder('Name')).toBeVisible();
  });

  test('closing checkout modal hides it', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectEssentialButton.click();
    await expect(plansPage.checkoutHeading).toBeVisible({ timeout: 5_000 });

    // Close via the ArrowLeft button inside the modal header
    await plansPage.closeCheckout();

    await expect(plansPage.checkoutHeading).toBeHidden();
  });

  test('selecting Standard plan shows correct plan in checkout', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectStandardButton.click();

    await expect(page.getByText('Standard Plan', { exact: false }).last()).toBeVisible({ timeout: 5_000 });
  });

  test('subscribe button is enabled in checkout modal', async ({ page }) => {
    await mockAPIs(page);
    const plansPage = new PlansPage(page);
    await plansPage.goto();

    await plansPage.selectEssentialButton.click();

    await expect(plansPage.subscribeButton).toBeEnabled({ timeout: 5_000 });
  });
});
