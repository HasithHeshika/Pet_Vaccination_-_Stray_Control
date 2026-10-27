const { test, expect } = require('@playwright/test');
const { api, adminToken, unique } = require('./helpers');

test.describe('Animal incident reporting', () => {
  test('a member of the public reports an injured animal without an account; the authority receives it', async ({ page, request }) => {
    const place = unique('Main Street bus stand ');
    await page.goto('/report-incident');
    await expect(page.getByRole('heading', { name: 'Report an Animal Incident' })).toBeVisible();
    await page.getByText('Sick or injured in public').click();
    await page.getByLabel('How urgent is it?').selectOption('urgent');
    await page.getByLabel('Location (Required)').fill(place);
    await page.getByLabel('Description (Required)').fill('Dog with an injured leg near the bus stand');
    await page.getByLabel('Phone or email').fill('0712223333');
    await page.getByRole('button', { name: 'Submit Report' }).click();
    await expect(page.getByRole('heading', { name: 'Thank You!' })).toBeVisible();

    const token = await adminToken(request);
    const list = await api(request, 'GET', '/api/stray-reports', { token });
    const report = (list.body.reports || list.body).find((r) => r.location === place);
    expect(report).toBeTruthy();
    expect(report.incidentType).toBe('sick_injured');
    expect(report.urgency).toBe('urgent');
  });

  test('the report form will not submit without the required details', async ({ page }) => {
    await page.goto('/report-incident');
    await page.getByRole('button', { name: 'Submit Report' }).click();
    await expect(page.getByRole('heading', { name: 'Thank You!' })).toHaveCount(0);
    await expect(page.getByLabel('Location (Required)')).toHaveJSProperty('validity.valid', false);
  });
});
