/**
 * settings.page.ts
 *
 * Page Object Model for the Account Settings page (/settings).
 */

import { type Page, type Locator } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;

  // Page header
  readonly heading: Locator;
  readonly subheading: Locator;

  // Section cards (identified by their section titles)
  readonly accountDetailsCard: Locator;
  readonly securityCard: Locator;
  readonly companyVatCard: Locator;
  readonly billingHistoryCard: Locator;
  readonly activeSubscriptionsCard: Locator;

  // Specific inputs and controls
  readonly emailInput: Locator;
  readonly vatInput: Locator;
  readonly saveChangesButton: Locator;
  readonly updatePasswordButton: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly upgradePlanButton: Locator;
  readonly deleteAccountButton: Locator;

  // Feedback message
  readonly feedbackMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Account Settings' });
    this.subheading = page.locator('text=/Manage your profile/');

    this.accountDetailsCard = page.locator('text=Account Details').first();
    this.securityCard = page.locator('text=Security').first();
    this.companyVatCard = page.locator('text=Company VAT').first();
    this.billingHistoryCard = page.locator('text=Billing History').first();
    this.activeSubscriptionsCard = page.locator('text=Active Subscriptions').first();

    this.emailInput = page.locator('input[type="email"][readonly]');
    this.vatInput = page.locator('input[placeholder="EU123456789"]');
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });
    this.updatePasswordButton = page.getByRole('button', { name: /update password/i });

    this.currentPasswordInput = page.locator('input[autocomplete="current-password"]');
    this.newPasswordInput = page.locator('input[autocomplete="new-password"]').first();
    this.confirmPasswordInput = page.locator('input[autocomplete="new-password"]').last();

    this.upgradePlanButton = page.getByRole('button', { name: /upgrade plan/i });
    this.deleteAccountButton = page.getByRole('button', { name: /delete account/i });

    this.feedbackMessage = page.locator('div.mb-6.border.px-4');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.heading.waitFor({ state: 'visible' });
  }

  async isLoaded(): Promise<boolean> {
    return this.heading.isVisible({ timeout: 8_000 }).catch(() => false);
  }

  async fillVat(vatId: string): Promise<void> {
    await this.vatInput.fill(vatId);
    await this.saveChangesButton.click();
  }

  async fillPasswordForm(current: string, newPass: string, confirm: string): Promise<void> {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(newPass);
    await this.confirmPasswordInput.fill(confirm);
    await this.updatePasswordButton.click();
  }
}
