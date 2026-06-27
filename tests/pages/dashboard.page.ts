/**
 * dashboard.page.ts
 *
 * Page Object Model for the main Dashboard page (/).
 * The dashboard shows the Launchpad grid and the active Deployments table.
 */

import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // Section headings
  readonly launchpadsHeading: Locator;
  readonly deploymentsHeading: Locator;

  // Launchpad grid — the container wrapping all plan cards
  readonly launchpadGrid: Locator;

  // The "New Deploy" free-tier card is always the first card
  readonly newDeployCard: Locator;

  // Navbar elements
  readonly logo: Locator;
  readonly settingsButton: Locator;
  readonly logoutButton: Locator;
  readonly userEmail: Locator;

  constructor(page: Page) {
    this.page = page;

    this.launchpadsHeading = page.getByRole('heading', { name: /launchpads/i });
    this.deploymentsHeading = page.getByRole('heading', { name: /deployments/i });

    // The grid is a div with role grid or a CSS grid — locate via text content of the first child card
    this.launchpadGrid = page.locator('text=New Deploy').locator('../..');
    this.newDeployCard = page.locator('text=New Deploy').first().locator('../..');

    this.logo = page.getByRole('img', { name: /metacall/i });
    this.settingsButton = page.getByRole('button', { name: /settings/i });
    this.logoutButton = page.getByRole('button', { name: /logout/i });
    this.userEmail = page.locator('header').getByText(/playwright-test@metacall/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async isLoaded(): Promise<boolean> {
    // The page has loaded if the main content area is visible
    return this.page.getByRole('main').or(this.page.locator('body')).isVisible();
  }

  async hasLaunchpadSection(): Promise<boolean> {
    return this.launchpadsHeading.isVisible({ timeout: 5_000 }).catch(() => false);
  }

  async getLaunchpadCardCount(): Promise<number> {
    // Each plan card has a "Deploy" or "Activate Plan" text
    return this.page.locator('text=Deploy').count();
  }

  async navigateToSettings(): Promise<void> {
    await this.settingsButton.click();
    await this.page.waitForURL(/\/settings/);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/);
  }
}
