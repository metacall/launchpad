/**
 * login.page.ts
 *
 * Page Object Model for the Login page (/login).
 * Selectors are anchored to stable DOM attributes (id, type, placeholder)
 * rather than fragile text-matching to ensure resilience across UI changes.
 */

import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginTab: Locator;
  readonly signupLink: Locator;
  readonly passwordToggle: Locator;
  readonly helpLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('text=|').locator('..').locator('span').last();
    this.loginTab = page.getByRole('button', { name: 'Login' }).first();
    this.signupLink = page.getByRole('link', { name: 'Signup' });
    this.passwordToggle = page.getByRole('button', { name: /show password|hide password/i });
    this.helpLink = page.getByRole('link', { name: 'Help' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    // Wait for the form to be ready
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async isVisible(): Promise<boolean> {
    return this.submitButton.isVisible();
  }

  async hasError(): Promise<boolean> {
    // The error block contains an X button and the message
    return this.page.locator('[aria-label="Clear error"]').isVisible().catch(() => false);
  }
}
