import { test, expect, type Page } from '@playwright/test';

const sellerEmail = process.env.E2E_SELLER_EMAIL;
const sellerPassword = process.env.E2E_SELLER_PASSWORD;
const hasCredentials = Boolean(sellerEmail && sellerPassword);

async function loginAsSeller(page: Page) {
  if (!sellerEmail || !sellerPassword) {
    throw new Error('Missing E2E seller credentials');
  }

  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

  await page.getByLabel('Email').fill(sellerEmail);
  await page.getByLabel('Password').fill(sellerPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Seller Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run seller E2E tests.');
    await loginAsSeller(page);
  });

  test('shows seller navigation and listing create route', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Listings' })).toBeVisible();

    await page.goto('/dashboard/products/new');
    await expect(page.getByRole('heading', { name: 'New Product' })).toBeVisible();
  });

  test('saves a seller listing draft with real APIs', async ({ page }) => {
    await page.goto('/dashboard/products/new');

    await page.getByLabel('Product Title *').fill(`E2E Draft ${Date.now()}`);
    await page.getByLabel('Description *').fill('E2E draft description for seller workflow coverage.');

    await page.getByRole('button', { name: 'Select a category' }).click();
    await page.getByRole('option', { name: 'Christmas' }).click();

    await page.getByRole('tab', { name: 'Pricing' }).click();
    await page.getByLabel('Price (USD) *').fill('19.99');

    await page.getByRole('tab', { name: 'Review' }).click();
    await page.getByRole('button', { name: 'Save Draft' }).click();

    await expect(page.getByText('Draft ID:')).toBeVisible();
  });
});
