import { expect, test } from '@playwright/test';

const deployment = {
  prefix: 'metacall',
  suffix: 'delete-me',
  version: 'v1',
  status: 'ready',
  packages: {},
  ports: [],
};

test.describe('Deployment deletion', () => {
  test('asks for confirmation before deleting a deployment', async ({ page }) => {
    let deleted = false;
    await page.route('**/*', route => {
      const request = route.request();
      if (['fetch', 'xhr'].includes(request.resourceType())) {
        if (request.method() === 'DELETE') {
          deleted = true;
          return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(deleted ? [] : [deployment]),
        });
      }
      return route.continue();
    });

    await page.goto('/deployments');
    await expect(page.getByText('delete-me').first()).toBeVisible({ timeout: 10_000 });

    await page.getByTitle('Delete Deployment').click();
    await expect(page.getByText('Delete deployment?')).toBeVisible();
    await expect(page.getByText('delete-me', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Deployment deleted successfully!')).toBeVisible({
      timeout: 10_000,
    });
  });
});
