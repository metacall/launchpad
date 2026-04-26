import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly deploymentSummary: Locator;
  readonly deploymentsLink: Locator;
  readonly logsLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.deploymentSummary = page.getByRole('heading', { name: /deployment/i });
    this.deploymentsLink = page.getByRole('link', { name: /deployment/i });
    this.logsLink = page.getByRole('link', { name: /log/i });
    this.settingsLink = page.getByRole('link', { name: /setting/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async isLoaded() {
    return this.page.getByRole('main').or(this.page.locator('body')).isVisible();
  }

  async hasDeploymentSummary() {
    return this.deploymentSummary.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async goToDeployments() {
    await this.deploymentsLink.click();
    await this.page.waitForURL(/\/deployments/);
  }

  async goToLogs() {
    await this.logsLink.click();
    await this.page.waitForURL(/\/logs/);
  }
}
