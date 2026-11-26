import { expect, test } from '@playwright/test';

test('docs site navigates, searches, and renders a grid', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Introduction/);
  await expect(page.getByRole('heading', { level: 1, name: 'Introduction' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible();

  await page.getByRole('link', { name: 'Installation', exact: true }).click();
  await expect(page).toHaveURL(/\/installation$/);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Installation');
  await expect(page.getByRole('heading', { level: 1, name: 'Installation' })).toBeVisible();

  await page.getByLabel('Search').fill('createGrid');
  await page
    .locator('.search-results')
    .getByRole('link', { name: 'createGrid', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'createGrid' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy' }).first()).toBeVisible();

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-docs-theme', /light|dark/);
  const before = await root.getAttribute('data-docs-theme');
  await page
    .getByRole('button', { name: before === 'dark' ? 'Light theme' : 'Dark theme' })
    .click();
  await expect(root).toHaveAttribute('data-docs-theme', before === 'dark' ? 'light' : 'dark');

  await page.getByRole('link', { name: 'Examples', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Employees', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ada Lovelace' }).first()).toBeVisible();
  await expect(page.getByRole('table', { name: 'Large dataset', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'v1 and v2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Planned for v2' })).toBeVisible();
  await expect(page.getByText('Cell editing and validation.')).toBeVisible();
  await expect(page.getByText('parity')).toHaveCount(0);
});

test('docs navigation stays available on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/getting-started');

  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open menu' });
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible();
  await page.getByRole('link', { name: 'Sorting', exact: true }).click();
  await expect(page).toHaveURL(/\/guides\/sorting$/);
});
