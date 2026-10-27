const { test, expect } = require('@playwright/test');
const { createUser, loginUI, api, adminToken, ADMIN } = require('./helpers');

const today = new Date().toISOString().slice(0, 10);

test.describe('Lost & Found with authority-reviewed matching', () => {
  test('lost report + nearby found report -> admin confirms the match -> owner sees the finder\'s contact', async ({ browser, request }) => {
    const owner = await createUser(request);
    const finder = await createUser(request);

    // Owner reports a missing dog through the form
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await loginUI(ownerPage, owner.email, owner.password);
    await ownerPage.goto('/lost-and-found/report');
    await ownerPage.getByLabel(/i lost a pet/i).check();
    await ownerPage.getByLabel(/^pet name/i).fill('Rocky');
    await ownerPage.getByLabel(/^species/i).selectOption('Dog');
    await ownerPage.getByLabel(/^breed/i).fill('Beagle');
    await ownerPage.getByLabel(/colour/i).fill('brown and white');
    await ownerPage.getByLabel(/last seen location/i).fill('Galle Fort');
    await ownerPage.getByLabel(/last seen date/i).fill(today);
    await ownerPage.getByLabel(/contact information/i).fill('owner 0771112222');
    await ownerPage.getByRole('button', { name: 'Submit Report' }).click();
    await expect(ownerPage).toHaveURL(/\/lost-and-found/);
    await expect(ownerPage.getByText('Rocky').first()).toBeVisible();

    // A different user reports finding a similar dog
    const finderContext = await browser.newContext();
    const finderPage = await finderContext.newPage();
    await loginUI(finderPage, finder.email, finder.password);
    await finderPage.goto('/lost-and-found/report?type=found');
    await expect(finderPage.getByLabel(/i found a pet/i)).toBeChecked();
    await finderPage.getByLabel(/^species/i).selectOption('Dog');
    await finderPage.getByLabel(/^breed/i).fill('Beagle');
    await finderPage.getByLabel(/colour/i).fill('white and brown');
    await finderPage.getByLabel(/where did you find it/i).fill('Galle Fort');
    await finderPage.getByLabel(/date found/i).fill(today);
    await finderPage.getByLabel(/contact information/i).fill('finder 0703334444');
    await finderPage.getByRole('button', { name: 'Submit Report' }).click();
    await expect(finderPage).toHaveURL(/\/lost-and-found/);

    // Matching runs in the background; wait until the suggestion exists
    const token = await adminToken(request);
    await expect.poll(async () => (await api(request, 'GET', '/api/matches?status=suggested', { token })).body.matches.length, { timeout: 15_000 }).toBeGreaterThan(0);

    // Nobody is told anything before the authority reviews it
    expect((await api(request, 'GET', '/api/matches/mine', { token: owner.token })).body.matches).toHaveLength(0);

    // The administrator reviews and confirms it
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginUI(adminPage, ADMIN.email, ADMIN.password);
    await adminPage.goto('/admin/matches');
    await expect(adminPage.getByRole('heading', { name: 'Possible Matches' })).toBeVisible();
    const card = adminPage.locator('article, .match-card, li').filter({ hasText: 'Rocky' }).first();
    await expect(card).toBeVisible();
    adminPage.once('dialog', (dialog) => dialog.accept('Same white patch on the chest'));
    await card.getByRole('button', { name: 'Confirm & notify' }).click();
    await expect(adminPage.getByText(/match confirmed/i)).toBeVisible();

    // The owner now sees the confirmed match with the finder's contact details
    await ownerPage.goto('/lost-and-found?tab=matches');
    await expect(ownerPage.getByText('finder 0703334444')).toBeVisible();
    await expect(ownerPage.getByText('Same white patch on the chest')).toBeVisible();

    // Both reports are now "In Progress"
    const feed = (await api(request, 'GET', '/api/lost-and-found')).body;
    const statuses = feed.filter((r) => /0771112222|0703334444/.test(r.contactInfo)).map((r) => r.status);
    expect(statuses).toEqual(['In Progress', 'In Progress']);

    await Promise.all([ownerContext.close(), finderContext.close(), adminContext.close()]);
  });

  test('the public feed filters by lost and found, and guests are asked to log in to report', async ({ page }) => {
    await page.goto('/lost-and-found');
    await page.getByRole('button', { name: 'Found' }).click();
    await expect(page).toHaveURL(/tab=found/);
    await page.getByRole('button', { name: 'Lost' }).click();
    await expect(page).toHaveURL(/tab=lost/);
    await page.goto('/lost-and-found/report');
    await expect(page).toHaveURL(/\/login$/);
  });
});
