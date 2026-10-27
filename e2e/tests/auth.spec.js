const { test, expect } = require('@playwright/test');
const { createUser, loginUI, unique, ADMIN } = require('./helpers');

test.describe('Accounts and access', () => {
  test('a new citizen signs up, waits for verification, is verified by the admin and logs in', async ({ page, browser }) => {
    const id = unique('signup');
    const email = `${id}@e2e.local`;

    await page.goto('/signup');
    await page.getByLabel('Account Type *').selectOption('user');
    await page.getByLabel('Full Name *').fill('Kamal Silva');
    await page.getByLabel('Email *').fill(email);
    await page.getByLabel('Password * (min 6 characters)').fill('Passw0rd!');
    await page.getByLabel('Confirm Password *').fill('Passw0rd!');
    await page.getByLabel('Phone Number *').fill('0712345678');
    await page.getByLabel('NIC Number *').fill(`${Date.now()}`.slice(-12));
    await page.getByLabel('Street Address *').fill('12 Temple Road');
    await page.getByLabel('City *').fill('Matara');
    await page.getByLabel('Province *').selectOption('Southern');
    await page.getByLabel('Postal Code *').fill('81000');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Sent back to the login page with the "awaiting verification" notice
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/awaiting administrator verification/i)).toBeVisible();

    // Logging in before verification is refused
    await loginUI(page, email, 'Passw0rd!', { expectSuccess: false });
    await expect(page.getByText(/awaiting administrator verification/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // The administrator verifies the account from the Users page
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginUI(adminPage, ADMIN.email, ADMIN.password);
    await expect(adminPage).toHaveURL(/\/admin\/dashboard$/);
    await adminPage.goto('/admin/users');
    const row = adminPage.getByRole('row').filter({ hasText: email });
    adminPage.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Verify' }).click();
    await expect(row.getByText('Verified')).toBeVisible();
    await adminContext.close();

    // Now the citizen can log in and lands on their dashboard
    await loginUI(page, email, 'Passw0rd!');
    await expect(page).toHaveURL(/\/user\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Welcome, Kamal Silva' })).toBeVisible();
  });

  test('wrong passwords are refused with a clear message', async ({ page, request }) => {
    const user = await createUser(request);
    await loginUI(page, user.email, 'not-my-password', { expectSuccess: false });
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a pet owner cannot open administrator pages', async ({ page, request }) => {
    const user = await createUser(request);
    await loginUI(page, user.email, user.password);
    await expect(page).toHaveURL(/\/user\/dashboard$/);
    for (const adminPath of ['/admin/dashboard', '/admin/users', '/admin/matches', '/admin/authority']) {
      await page.goto(adminPath);
      await expect(page).toHaveURL(/\/user\/dashboard$/);
    }
  });

  test('guests are sent to the login page from private pages', async ({ page }) => {
    for (const privatePath of ['/user/dashboard', '/user/my-pets', '/lost-and-found/report', '/breeder/dashboard']) {
      await page.goto(privatePath);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('forgot password gives the same answer whether or not the account exists', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('nobody-here@e2e.local');
    await page.getByRole('button', { name: /send|reset/i }).click();
    await expect(page.getByText(/if an account exists for that email/i)).toBeVisible();
  });

  test('logging out ends the session', async ({ page, request }) => {
    const user = await createUser(request);
    await loginUI(page, user.email, user.password);
    await expect(page).toHaveURL(/\/user\/dashboard$/);
    await page.getByRole('button', { name: /log ?out/i }).first().click();
    await page.goto('/user/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
