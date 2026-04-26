import { Page } from '@playwright/test';

/**
 * Wait for API response matching a URL pattern
 * Useful for deployment, logs, and function endpoints
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}

 //Check if user is authenticated (MetaCall uses localStorage token)
export async function isAuthenticated(page: Page): Promise<boolean> {
  const context = page.context();
  const cookies = await context.cookies();
  const localStorageToken = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('auth_token'));

  return cookies.some((c) => c.name.toLowerCase().includes('auth')) || !!localStorageToken;
}


//Clear authentication state from localStorage and cookies
export async function clearAuthentication(page: Page) {
  const context = page.context();
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}


//Mock API endpoint with response
export async function mockAPIEndpoint(page: Page, urlPattern: string | RegExp, response: any) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}


//Generate unique test email for user creation tests
export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test.${timestamp}@example.com`;
}


//Generate unique identifier for test data
export function generateUniqueId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
