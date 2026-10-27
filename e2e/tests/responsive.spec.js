// Runs on the "mobile-chrome" project (Pixel 7 screen): no page should scroll sideways
const { test, expect } = require('@playwright/test');

const pages = ['/', '/login', '/signup', '/lost-and-found', '/report-incident', '/forgot-password'];

for (const url of pages) {
  test(`no horizontal scrolling on a phone: ${url}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
