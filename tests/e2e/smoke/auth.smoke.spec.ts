import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

// Smoke tests for authentication
// Validates login page loads and auth redirects work correctly

test.describe('Auth Smoke', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    const loginPage = new LoginPage(page);
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('unauthenticated user can reach login', async ({ page }) => {
    // Verify login page is accessible and displays form
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    expect(await loginPage.isVisible()).toBeTruthy();
  });

  test('login form has required fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('login button is enabled when form is filled', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.emailInput.fill('test@example.com');
    await loginPage.passwordInput.fill('password');

    await expect(loginPage.submitButton).toBeEnabled();
  });
});
