/**
 * plans.page.ts
 *
 * Page Object Model for the Plans / Pricing page (/plans).
 */

import { type Page, type Locator } from '@playwright/test';

export class PlansPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly subheading: Locator;
  readonly backButton: Locator;

  // Plan cards — one per plan tier
  readonly essentialCard: Locator;
  readonly standardCard: Locator;
  readonly premiumCard: Locator;

  // Select buttons inside each card
  readonly selectEssentialButton: Locator;
  readonly selectStandardButton: Locator;
  readonly selectPremiumButton: Locator;

  // Checkout modal
  readonly checkoutModal: Locator;
  readonly checkoutHeading: Locator;
  readonly subscribeButton: Locator;
  readonly closeCheckoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: /select one of our subscription plans/i });
    this.subheading = page.locator('text=/Scale effortlessly/');
    this.backButton = page.getByTitle('Close Plans');

    this.essentialCard = page.locator('text=Essential Plan').locator('../..');
    this.standardCard = page.locator('text=Standard Plan').locator('../..');
    this.premiumCard = page.locator('text=Premium Plan').locator('../..');

    this.selectEssentialButton = page.getByRole('button', { name: /select essential/i });
    this.selectStandardButton = page.getByRole('button', { name: /select standard/i });
    this.selectPremiumButton = page.getByRole('button', { name: /select premium/i });

    this.checkoutModal = page.locator('text=Checkout').locator('../..');
    this.checkoutHeading = page.getByRole('heading', { name: 'Checkout', exact: true });
    this.subscribeButton = page.getByRole('button', { name: /subscribe/i });
    this.closeCheckoutButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
  }

  async goto(): Promise<void> {
    await this.page.goto('/plans');
    await this.heading.waitFor({ state: 'visible' });
  }

  async isLoaded(): Promise<boolean> {
    return this.heading.isVisible({ timeout: 8_000 }).catch(() => false);
  }

  async openEssentialCheckout(): Promise<void> {
    await this.selectEssentialButton.click();
    await this.checkoutHeading.waitFor({ state: 'visible' });
  }

  async closeCheckout(): Promise<void> {
    // The close button inside the modal (ArrowLeft icon button)
    await this.page.locator('.fixed').getByRole('button').first().click();
    await this.checkoutHeading.waitFor({ state: 'hidden' });
  }
}
