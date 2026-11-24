import { expect, test } from '@playwright/test';

test('playground mounts the react adapter and the base theme', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MyGrid playground' })).toHaveCount(1);
  const root = page.locator('[data-mygrid="mygrid"]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-mygrid-adapter', 'react');
  await expect(root).not.toHaveAttribute('role', 'grid');
  await expect(page.getByText('does not render rows, columns, or cells')).toBeVisible();
  await expect(page.getByText('@inno-grid/mygrid-core')).toBeVisible();
  await expect(page.getByText('@inno-grid/mygrid-react')).toBeVisible();
  await expect(page.getByText('@inno-grid/mygrid-themes')).toBeVisible();
  await expect(page.getByText('#0c6b58', { exact: true })).toBeVisible();
  await expect(page.getByText('independent library')).toBeVisible();
});

test('playground stays readable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MyGrid playground' })).toBeVisible();
  await expect(page.locator('[data-mygrid="mygrid"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeAttached();
});
