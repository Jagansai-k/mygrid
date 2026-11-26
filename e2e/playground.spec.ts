import { expect, test } from '@playwright/test';

test('playground mounts the react adapter and the base theme', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MyGrid playground' })).toHaveCount(1);
  const root = page.locator('[data-mygrid="mygrid"]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-mygrid-adapter', 'react');
  await expect(root).not.toHaveAttribute('role', 'grid');
  await expect(page.getByRole('table', { name: 'Staff' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Grace Hopper' })).toBeVisible();
  await page.getByRole('button', { name: 'Sort Name ascending' }).click();
  await expect(page.getByRole('cell', { name: 'Ada Lovelace' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Grace Hopper' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show Salary' }).click();
  await expect(page.getByRole('columnheader', { name: /Salary/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  await expect(page.getByText('@inno-grid/mygrid-core')).toBeVisible();
  await expect(page.getByText('@inno-grid/mygrid-react')).toBeVisible();
  await expect(page.getByText('@inno-grid/mygrid-themes')).toBeVisible();
  await expect(page.getByText('#0c6b58', { exact: true })).toBeVisible();
  await expect(page.getByText('independent library')).toBeVisible();
});

test('playground applies the dark theme and compact density', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.getByRole('button', { name: 'Compact', exact: true }).click();

  const root = page.locator('[data-mygrid="mygrid"]');
  await expect(root).toHaveAttribute('data-mygrid-theme', 'dark');
  await expect(root).toHaveAttribute('data-mygrid-density', 'compact');
  await expect(root).not.toHaveAttribute('role', 'grid');

  const tokens = await root.evaluate((element) => {
    const view = globalThis as {
      getComputedStyle?: (target: unknown) => { getPropertyValue: (property: string) => string };
    };
    const style = view.getComputedStyle?.(element);
    return {
      accent: style?.getPropertyValue('--mygrid-color-accent').trim() ?? '',
      space: style?.getPropertyValue('--mygrid-space-cell-y').trim() ?? '',
    };
  });
  expect(tokens.accent).toBe('#3dbea0');
  expect(tokens.space.replace(/^0(?=\.)/, '')).toBe('.25rem');
});

test('playground virtualizes a large dataset', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Dataset').selectOption('1000');
  const status = page.locator('.metrics');
  await expect(status).toContainText('of 1000');
  await expect
    .poll(async () => {
      const text = (await status.textContent()) ?? '';
      const rows = /Rows (\d+) of (\d+)/.exec(text);
      const columns = /Columns (\d+) of (\d+)/.exec(text);
      if (rows === null || columns === null) {
        return false;
      }
      const renderedRows = Number(rows[1]);
      const totalRows = Number(rows[2]);
      const renderedColumns = Number(columns[1]);
      const totalColumns = Number(columns[2]);
      return (
        totalRows === 1000 &&
        renderedRows > 0 &&
        renderedRows < totalRows &&
        totalColumns > 10 &&
        renderedColumns > 0 &&
        renderedColumns < totalColumns
      );
    })
    .toBe(true);
  await expect(page.getByRole('table', { name: 'Volume' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Name/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Note' })).toBeVisible();
});

test('playground stays readable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MyGrid playground' })).toBeVisible();
  await expect(page.locator('[data-mygrid="mygrid"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeAttached();
});
