/**
 * settings.spec.ts
 *
 * Full E2E test suite for the Account Settings page (/settings).
 *
 * Runs WITH pre-seeded auth storageState (from global-setup.ts).
 * API calls are intercepted so no live server is required.
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../pages/settings.page';

async function mockAPIs(page: import('@playwright/test').Page) {
  await page.route('**/api/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/dashboard.metacall.io/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('Settings Page — Layout & Structure', () => {
  test('renders Account Settings heading', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.heading).toBeVisible();
  });

  test('renders the page description subheading', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(page.getByText(/Manage your profile/i)).toBeVisible();
  });

  test('Account Details section card is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.accountDetailsCard).toBeVisible();
  });

  test('Security (password) section card is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.securityCard).toBeVisible();
  });

  test('Company VAT section card is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.companyVatCard).toBeVisible();
  });

  test('Billing History section card is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.billingHistoryCard).toBeVisible();
  });

  test('Active Subscriptions section card is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.activeSubscriptionsCard).toBeVisible();
  });
});

test.describe('Settings Page — Account Details', () => {
  test('email input is read-only and contains the mock test email', async ({ page }) => {
    await mockAPIs(page);
    // Inject the email into localStorage before loading
    await page.addInitScript(() => {
      localStorage.setItem('faas_user_email', 'playwright-test@metacall.io');
    });

    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.emailInput).toBeVisible();
    await expect(settingsPage.emailInput).toHaveAttribute('readonly', '');
    await expect(settingsPage.emailInput).toHaveValue('playwright-test@metacall.io');
  });

  test('CLI Token field is present and read-only', async ({ page }) => {
    await mockAPIs(page);
    await page.addInitScript(() => {
      localStorage.setItem('faas_token', 'mock-test-jwt-token-for-playwright-e2e');
    });

    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    // The CLI token input is read-only
    const tokenInput = page.locator('input[type="text"][readonly]').first();
    await expect(tokenInput).toBeVisible();
    await expect(tokenInput).toHaveAttribute('readonly', '');
  });
});

test.describe('Settings Page — VAT Form', () => {
  test('VAT input is editable', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.vatInput).toBeVisible();
    await expect(settingsPage.vatInput).toBeEditable();
  });

  test('Save Changes button is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.saveChangesButton).toBeVisible();
  });

  test('filling VAT and saving shows success feedback', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.fillVat('EU123456789');

    await expect(page.getByText(/Settings saved locally/i)).toBeVisible({ timeout: 5_000 });
  });

  test('VAT value is persisted to localStorage on save', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.fillVat('EU999888777');
    await settingsPage.saveChangesButton.click();

    const stored = await page.evaluate(() => localStorage.getItem('faas_vat_id'));
    expect(stored).toBe('EU999888777');
  });
});

test.describe('Settings Page — Password Form', () => {
  test('all three password fields are present', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.currentPasswordInput).toBeVisible();
    await expect(settingsPage.newPasswordInput).toBeVisible();
    await expect(settingsPage.confirmPasswordInput).toBeVisible();
  });

  test('Update Password button is visible', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.updatePasswordButton).toBeVisible();
  });

  test('shows error when submitting with empty fields', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.updatePasswordButton.click();

    await expect(page.getByText(/All password fields are required/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows error when new password is too short', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.fillPasswordForm('current123', 'abc', 'abc');

    await expect(page.getByText(/at least 6 characters/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.fillPasswordForm('current123', 'newpassword123', 'differentpassword');

    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows success feedback on valid password form submission', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.fillPasswordForm('current123', 'newpassword123', 'newpassword123');

    await expect(page.getByText(/Password form validated/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Settings Page — Subscriptions & Billing', () => {
  test('Upgrade Plan button navigates to /plans', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await settingsPage.upgradePlanButton.click();
    await expect(page).toHaveURL(/\/plans/);
  });

  test('Billing History table has correct column headers', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(page.getByRole('columnheader', { name: /receipt/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /date/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /amount/i })).toBeVisible();
  });

  test('Active Subscriptions table has correct column headers', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(page.getByRole('columnheader', { name: /plan/i }).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('columnheader', { name: /deploy/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /date/i }).first()).toBeVisible();
  });

  test('Privacy policy external link is present', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    const privacyLink = page.getByRole('link', { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', 'https://metacall.io/privacy');
  });

  test('Terms and Conditions external link is present', async ({ page }) => {
    await mockAPIs(page);
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    const termsLink = page.getByRole('link', { name: /terms and conditions/i });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute('href', 'https://metacall.io/terms');
  });
});
