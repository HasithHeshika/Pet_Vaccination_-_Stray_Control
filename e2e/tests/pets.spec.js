const { test, expect } = require('@playwright/test');
const { createUser, registerPet, loginUI } = require('./helpers');

test.describe('Pet registration and the public QR profile', () => {
  test('the owner sees a pet the authority registered for them, with its QR code', async ({ page, request }) => {
    const owner = await createUser(request);
    const pet = await registerPet(request, owner.id, { petName: 'Tiger' });

    await loginUI(page, owner.email, owner.password);
    await page.goto('/user/my-pets');
    await expect(page.getByRole('heading', { name: 'My Pets' })).toBeVisible();
    await expect(page.getByText('Tiger').first()).toBeVisible();
    await expect(page.getByText(pet.petId).first()).toBeVisible();
  });

  test('anyone scanning the QR code sees the pet but not the owner\'s contact details', async ({ page, request }) => {
    const owner = await createUser(request, { phone: '0779998888' });
    const pet = await registerPet(request, owner.id, { petName: 'Lucky' });

    await page.goto(`/pet-profile/${pet.petId}`);
    await expect(page.getByRole('heading', { name: 'Pet Registration Certificate' })).toBeVisible();
    await expect(page.getByText('Lucky').first()).toBeVisible();
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain(owner.email);
    expect(pageText).not.toContain('0779998888');
    // Finders contact the owner through the relay form instead
    await expect(page.getByRole('heading', { name: /found this pet\? contact the owner/i })).toBeVisible();
    await expect(page.getByLabel('Your name')).toBeVisible();
  });

  test('an unknown Pet ID shows a friendly "not found" page', async ({ page }) => {
    await page.goto('/pet-profile/PET-DOES-NOT-EXIST');
    await expect(page.getByRole('heading', { name: 'Pet Not Found' })).toBeVisible();
  });
});
