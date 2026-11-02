import { expect, test } from '@playwright/test';

const deployment = {
  prefix: 'metacall',
  suffix: 'hello-world',
  version: 'v1',
  status: 'ready',
  packages: {},
  runners: [],
  ports: [{ port: 8080 }],
};

test.describe('Function inspection and execution', () => {
  test('opens deployment details from the deployments list', async ({ page }) => {
    await page.route('**/*', route => {
      const request = route.request();
      if (['fetch', 'xhr'].includes(request.resourceType())) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([deployment]),
        });
      }
      return route.continue();
    });

    await page.goto('/deployments');
    await expect(page.getByText('hello-world').first()).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('View Details').click();
    await expect(page).toHaveURL(/\/deployments\/hello-world/, { timeout: 10_000 });
  });
});
