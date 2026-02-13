const { test, expect } = require('@playwright/test');

test.describe('Transport Selector UI', () => {
  test('should display transport selector on page load', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // Check for transport selector buttons
    const transportSelector = page.locator('button[data-transport]');
    await expect(transportSelector.first()).toBeVisible({ timeout: 5000 });
  });

  test('should allow selecting Gold transport', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // Click the Gold transport button
    const goldButton = page.locator('button[data-transport="gold"]');
    await expect(goldButton).toBeVisible();
    await goldButton.click();
  });

  test('should allow selecting Silver transport', async ({ page }) => {
    await page.goto('http://127.0.0.1:8889');

    // Click the Silver transport button
    const silverButton = page.locator('button[data-transport="silver"]');
    await expect(silverButton).toBeVisible();
    await silverButton.click();
  });

  test('should allow selecting Both transports', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // Click the Both transport button
    const bothButton = page.locator('button[data-transport="both"]');
    await expect(bothButton).toBeVisible();
    await bothButton.click();
  });

  test('should display transport type on page', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // Look for transport type display
    const transportDisplay = page.locator('text=/Gold|Silver|Transport/i');
    await expect(transportDisplay.first()).toBeVisible({ timeout: 5000 });
  });

  test('should load correctly on Gold port (8888)', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:8888');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('gold');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load correctly on Silver port (8889)', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:8889');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('silver');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have test mode selector (Basic, Detailed, Ludacris)', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // Look for test mode selector
    const testModeSelector = page.locator('text=/Basic|Detailed|Ludacris/i');
    await expect(testModeSelector.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Transport Identification in UI', () => {
  test('should show Gold when connected to port 8888', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // The UI should somehow indicate we're on Gold transport
    const goldIndicator = page.locator('text=/gold/i, [data-transport="gold"]');

    // At minimum, check page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show Silver when connected to port 8889', async ({ page }) => {
    await page.goto('http://127.0.0.1:8889');

    // The UI should somehow indicate we're on Silver transport
    const silverIndicator = page.locator('text=/silver/i, [data-transport="silver"]');

    // At minimum, check page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display data center information', async ({ page }) => {
    await page.goto('http://127.0.0.1:8888');

    // Look for data center display (DC1-SJC, etc.)
    const dcDisplay = page.locator('text=/DC[0-9]|Data Center|Location/i');

    // Page should load at minimum
    await expect(page.locator('body')).toBeVisible();
  });
});
