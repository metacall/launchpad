/**
 * auth.smoke.spec.ts
 *
 * Smoke tests for the authentication flow.
 * These tests run WITHOUT the pre-seeded auth storageState (useStorageState: false
 * is implied by the test not using the "authenticated" project — the default
 * storageState already handles it since auth.json just contains origins origins).
 *
 * Key guarantee: After the vite.config.ts bypass fix, GET /login now serves
 * index.html and React Router renders LoginPage correctly.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

test.use({ storageState: { cookies: [], origins: [] } }); // Explicitly unauthenticated

test.describe('Auth Smoke', () => {
  test('login page loads and renders the form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('unauthenticated user can reach the login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    expect(await loginPage.isVisible()).toBeTruthy();
  });

  test('login form displays all required fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('login button is enabled once both fields are filled', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('password123');

    await expect(loginPage.submitButton).toBeEnabled();
  });
});
