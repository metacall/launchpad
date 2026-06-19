/**
 * deployments.page.ts
 *
 * Page Object Model for the Deployments list page (/deployments).
 */

import { type Page, type Locator } from '@playwright/test';

export class DeploymentsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly subheading: Locator;
  readonly newDeployButton: Locator;
  readonly refreshButton: Locator;
  readonly homeButton: Locator;
  readonly tableContainer: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Deployments', exact: true });
    this.subheading = page.locator('text=/Tracking|Fetching active/');
    this.newDeployButton = page.getByRole('button', { name: /new deploy/i });
    this.refreshButton = page.getByTitle('Refresh');
    this.homeButton = page.getByRole('button', { name: /home/i });
    this.tableContainer = page.locator('div.bg-white.border.border-gray-300');
    this.errorBanner = page.locator('[aria-label="Clear error"]').locator('..');
  }

  async goto(): Promise<void> {
    await this.page.goto('/deployments');
    await this.heading.waitFor({ state: 'visible' });
  }

  async isLoaded(): Promise<boolean> {
    return this.heading.isVisible({ timeout: 8_000 }).catch(() => false);
  }

  async clickNewDeploy(): Promise<void> {
    await this.newDeployButton.click();
    await this.page.waitForURL(/\/deployments\/new/);
  }

  async clickHome(): Promise<void> {
    await this.homeButton.click();
    await this.page.waitForURL('/');
  }
}
