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

  test('passenger can open routes and waiting controls without staff sign-in', async ({ page }) => {
    const response = await page.goto('/passenger.html');
    expect(response && response.status()).toBe(200);
    await page.getByRole('button', { name: /Find a Taxi/ }).click();
    await expect(page.getByRole('heading', { name: 'Where are you going?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Available Taxis' })).toBeVisible();
    await expect(page.locator('#pass-sun')).toBeVisible();
    await expect(page.locator('#pass-rust')).toBeVisible();
    await expect(page.locator('#groupVal')).toHaveText('1');
    await expect(page.getByRole('button', { name: /Alert Conductor/ })).toBeVisible();
  });

  test('driver sign-in and password visibility control work', async ({ page }) => {
    const response = await page.goto('/driver.html');
    expect(response && response.status()).toBe(200);
    await expect(page).toHaveTitle(/TaxiConnect.*Driver/);
    await expect(page.getByRole('heading', { name: 'Driver sign in' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    const password = page.locator('#passwordInput');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: 'Enter App' })).toBeVisible();
  });

  test('operator sign-in and password visibility control work', async ({ page }) => {
    const response = await page.goto('/conductor.html');
    expect(response && response.status()).toBe(200);
    await expect(page).toHaveTitle(/TaxiConnect.*Operator \/ Dispatcher/);
    await expect(page.getByRole('heading', { name: 'Operator \/ dispatcher sign in' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    const password = page.locator('#passwordInput');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).toBeVisible();
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
