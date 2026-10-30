import { expect, test } from '@playwright/test';

test.describe('ZIP deployment', () => {
  test('navigates from the deployment hub to the ZIP wizard', async ({ page }) => {
    await page.route('**/api/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    await page.goto('/deployments/new');
    await expect(page.getByRole('heading', { name: 'MetaCall Deployment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Deploy Zip' })).toBeVisible();

    const fileInput = page.locator('input[type="file"][accept=".zip"]');
    await fileInput.setInputFiles({
      name: 'hello.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('test archive'),
    });

    await expect(page).toHaveURL(/\/deployments\/new\/wizard/, { timeout: 10_000 });
  });
});
