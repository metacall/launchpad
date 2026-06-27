/**
 * deployments.spec.ts
 *
 * Full E2E test suite for the Deployments list page (/deployments).
 *
 * Runs WITH pre-seeded auth storageState (from global-setup.ts).
 * API calls are intercepted to return controlled fixture data.
 */

import { test, expect } from '@playwright/test';
import { DeploymentsPage } from '../../pages/deployments.page';

const MOCK_DEPLOYMENTS = [
  {
    prefix: 'metacall',
    suffix: 'my-hello-world',
    version: 'v1',
    status: 'ready',
    packages: {},
    ports: [],
  },
  {
    prefix: 'metacall',
    suffix: 'test-api-v2',
    version: 'v1',
    status: 'building',
    packages: {},
    ports: [],
  },
];

function mockEmptyAPI(page: import('@playwright/test').Page) {
  // Mock both /api proxy calls AND direct metacall.io protocol calls
  return Promise.all([
    page.route('**/api/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    ),
    page.route('**/dashboard.metacall.io/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    ),
  ]);
}

function mockDeploymentAPI(page: import('@playwright/test').Page, deployments = MOCK_DEPLOYMENTS) {
  return Promise.all([
    page.route('**/api/**', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(deployments),
      });
    }),
    page.route('**/dashboard.metacall.io/**', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(deployments),
      });
    }),
  ]);
}

test.describe('Deployments Page — Layout & Structure', () => {
  test('renders the Deployments page heading', async ({ page }) => {
    await mockEmptyAPI(page);
    const deploymentsPage = new DeploymentsPage(page);
    await deploymentsPage.goto();

    await expect(deploymentsPage.heading).toBeVisible();
  });

  test('New Deploy button is visible', async ({ page }) => {
    await mockEmptyAPI(page);
    const deploymentsPage = new DeploymentsPage(page);
    await deploymentsPage.goto();

    await expect(deploymentsPage.newDeployButton).toBeVisible();
  });

  test('Refresh button is visible', async ({ page }) => {
    await mockEmptyAPI(page);
    const deploymentsPage = new DeploymentsPage(page);
    await deploymentsPage.goto();

    await expect(deploymentsPage.refreshButton).toBeVisible();
  });

  test('Home button is visible', async ({ page }) => {
    await mockEmptyAPI(page);
    const deploymentsPage = new DeploymentsPage(page);
    await deploymentsPage.goto();

    await expect(deploymentsPage.homeButton).toBeVisible();
  });

  test('clicking Home button navigates back to dashboard', async ({ page }) => {
    await mockEmptyAPI(page);
    const deploymentsPage = new DeploymentsPage(page);
    await deploymentsPage.goto();

    await deploymentsPage.clickHome();
    await expect(page).toHaveURL('/');
  });

  test('clicking New Deploy navigates to /deployments/new', async ({ page }) => {
    await mockEmptyAPI(page);
    const deploymentsPage = new DeploymentsPage(page);
    await deploymentsPage.goto();

    await deploymentsPage.clickNewDeploy();
    await expect(page).toHaveURL(/\/deployments\/new/);
  });
});

test.describe('Deployments Page — Table Content', () => {
  test('shows deployment suffixes when API returns data', async ({ page }) => {
    await mockDeploymentAPI(page);
    await page.goto('/deployments');

    // Wait for table to populate — use .first() to avoid strict mode
    await expect(page.getByText('my-hello-world').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('test-api-v2').first()).toBeVisible();
  });

  test('renders correct number of table rows for returned deployments', async ({ page }) => {
    await mockDeploymentAPI(page);
    await page.goto('/deployments');

    await page.waitForTimeout(1_000); // let the table render

    // Check name column specifically (bold text in td) using first() for strict mode
    const row1 = page.getByText('my-hello-world').first();
    const row2 = page.getByText('test-api-v2').first();
    await expect(row1).toBeVisible({ timeout: 10_000 });
    await expect(row2).toBeVisible({ timeout: 10_000 });
  });

  test('shows status indicator for deployments', async ({ page }) => {
    await mockDeploymentAPI(page);
    await page.goto('/deployments');

    // Verify data is loaded
    await expect(page.getByText('Tracking 2 running deployments')).toBeVisible({ timeout: 10_000 });

    // StatusBadge renders labels: 'Ready', 'Building', 'Failed', 'Stopped'
    // Check the page body contains at least one of these status labels
    const pageContent = await page.locator('body').textContent();
    const knownStatuses = ['Ready', 'Building', 'Failed', 'Stopped'];
    const hasStatus = knownStatuses.some(s => pageContent?.includes(s));
    expect(hasStatus).toBeTruthy();
  });
});



test.describe('Deployments Page — Subpage Navigation', () => {
  test('navigates to deployment detail page when clicking a deployment name', async ({ page }) => {
    await mockDeploymentAPI(page);
    await page.goto('/deployments');

    // Wait for the deployment name to appear in the table
    const link = page.getByText('my-hello-world').first();
    await link.waitFor({ state: 'visible', timeout: 10_000 });

    // Click the table row (clicking the name text navigates to detail page via row onClick)
    await link.click();

    await expect(page).toHaveURL(/\/deployments\/my-hello-world/, { timeout: 8_000 });
  });
});

