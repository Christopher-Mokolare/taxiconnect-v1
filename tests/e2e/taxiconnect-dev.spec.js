const { test, expect } = require('@playwright/test');

test.describe('TaxiConnect development smoke tests', () => {
  test('landing page exposes all three workspaces', async ({ page }) => {
    const response = await page.goto('/');
    expect(response && response.status()).toBe(200);
    await expect(page).toHaveTitle(/TaxiConnect/);
    await expect(page.getByRole('link', { name: /Passenger/ })).toHaveAttribute('href', '/passenger.html');
    await expect(page.getByRole('link', { name: /Driver/ })).toHaveAttribute('href', '/driver.html');
    await expect(page.getByRole('link', { name: /Operator \/ Dispatcher/ })).toHaveAttribute('href', '/conductor.html');
    await expect(page.getByText('Sun City', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Rustenburg', { exact: true }).first()).toBeVisible();
  });

  test('passenger can open the route and waiting screen without signing in', async ({ page }) => {
    const response = await page.goto('/passenger.html');
    expect(response && response.status()).toBe(200);
    await expect(page.getByRole('button', { name: /Find a Taxi/ })).toBeVisible();
    await page.getByRole('button', { name: /Find a Taxi/ }).click();
    await expect(page.getByText('Where are you going?')).toBeVisible();
    await expect(page.getByText('Available Taxis')).toBeVisible();
    await expect(page.getByLabel('Your pickup point')).toBeVisible();
    await expect(page.getByRole('button', { name: /Register Demand/ })).toBeVisible();
    await expect(page.locator('#groupVal')).toHaveText('1');
  });

  test('driver sign-in screen and password visibility control work', async ({ page }) => {
    const response = await page.goto('/driver.html');
    expect(response && response.status()).toBe(200);
    await expect(page).toHaveTitle(/TaxiConnect.*Driver/);
    await expect(page.getByRole('heading', { name: 'Driver sign in' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    const password = page.locator('#passwordInput');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide' }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: 'Enter App' })).toBeVisible();
  });

  test('operator sign-in screen and password visibility control work', async ({ page }) => {
    const response = await page.goto('/conductor.html');
    expect(response && response.status()).toBe(200);
    await expect(page).toHaveTitle(/Operator \/ Dispatcher/);
    await expect(page.getByRole('heading', { name: 'Operator \/ dispatcher sign in' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    const password = page.locator('#passwordInput');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Dashboard' })).toBeVisible();
  });

  test('all role pages fit a mobile viewport without horizontal overflow', async ({ page }) => {
    for (const path of ['/', '/passenger.html', '/driver.html', '/conductor.html']) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth
      }));
      expect(dimensions.content, path + ' has horizontal overflow').toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  });
});
