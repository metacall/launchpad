/**
 * login.spec.ts
 *
 * Full E2E test suite for the Login page (/login).
 *
 * Runs WITHOUT auth storageState (explicitly unauthenticated) so the login
 * page is always rendered. API calls are mocked to control responses.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

// All tests in this file are unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page — UI & Accessibility', () => {
  test('renders the login form with all elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('displays the MetaCall logo', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('img', { name: /metacall/i })).toBeVisible();
  });

  test('has a Signup navigation link', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.signupLink).toBeVisible();
    await expect(loginPage.signupLink).toHaveAttribute('href', '/signup');
  });

  test('has a Help link pointing to metacall docs', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.helpLink).toBeVisible();
    await expect(loginPage.helpLink).toHaveAttribute('href', 'https://metacall.io/docs');
  });

  test('email input has correct type and autocomplete', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
    await expect(loginPage.emailInput).toHaveAttribute('autocomplete', 'email');
  });

  test('password input has correct type and autocomplete', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  test('submit button is of type submit', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.submitButton).toHaveAttribute('type', 'submit');
  });
});

test.describe('Login Page — Form Interaction', () => {
  test('submit button is enabled after filling both fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail('user@example.com');
    await loginPage.fillPassword('securepassword');

    await expect(loginPage.submitButton).toBeEnabled();
  });

  test('email input accepts typed text correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail('test@metacall.io');
    await expect(loginPage.emailInput).toHaveValue('test@metacall.io');
  });

  test('password input masks typed characters', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await loginPage.fillPassword('mysecretpassword');
    await expect(loginPage.passwordInput).toHaveValue('mysecretpassword');
  });

  test('password visibility toggle button is present', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // The toggle button contains an eye icon — it's a button with an aria-label
    const toggle = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]');
    await expect(toggle).toBeVisible();
  });

  test('Signup link navigates to /signup page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe('Login Page — Auth Outcomes', () => {
  test('shows error message on failed login', async ({ page }) => {
    // Intercept POST /login to return a 401
    await page.route('**/login**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'text/plain',
          body: 'Invalid credentials',
        });
      } else {
        await route.continue();
      }
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('wrong@example.com', 'wrongpassword');

    // An error notification should appear — look for the clear-error button
    await expect(
      page.locator('[aria-label="Clear error"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('redirects to dashboard on successful login', async ({ page }) => {
    // Intercept POST /login to return a mock JWT token
    await page.route('**/login**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'mock-jwt-success-token' }),
        });
      } else {
        await route.continue();
      }
    });

    // Also mock API calls that the dashboard makes on load
    await page.route('**/api/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('test@metacall.io', 'validpassword');

    // Should redirect to the dashboard
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });
});
