import { expect, test, type Page } from '@playwright/test';

async function showResults(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('tab', { name: /Cutlist|Skæreliste/ }).click();
}

test('creates a sheet material and optimizes 2D cuts', async ({ page, isMobile }) => {
  await page.goto('./');
  if (isMobile) await page.getByRole('tab', { name: /Stock & parts/ }).click();

  // Switch to Sheets
  await page.getByRole('radio', { name: 'Sheets' }).click();

  // Stock length and width: 2440 x 1220
  const stockRow = page.getByTestId('stock-row').first();
  await stockRow.getByRole('textbox', { name: 'Length', exact: true }).fill('2440');
  await stockRow.getByRole('textbox', { name: 'Width', exact: true }).fill('1220');

  // Add Part 1
  await page.getByRole('button', { name: 'Add part' }).first().click();
  const partRow1 = page.getByTestId('part-row').first();
  await partRow1.getByRole('textbox', { name: 'Part', exact: true }).fill('Shelf');
  await partRow1.getByRole('textbox', { name: 'Length', exact: true }).fill('1200');
  await partRow1.getByRole('textbox', { name: 'Width', exact: true }).fill('600');
  await partRow1.getByRole('textbox', { name: 'Qty', exact: true }).fill('2');

  // Add Part 2
  await page.getByRole('button', { name: 'Add part' }).first().click();
  const partRow2 = page.getByTestId('part-row').last();
  await partRow2.getByRole('textbox', { name: 'Part', exact: true }).fill('Panel');
  await partRow2.getByRole('textbox', { name: 'Length', exact: true }).fill('800');
  await partRow2.getByRole('textbox', { name: 'Width', exact: true }).fill('400');
  await partRow2.getByRole('textbox', { name: 'Qty', exact: true }).fill('2');

  await showResults(page, isMobile);

  // Expect sheet result
  await expect(page.getByTestId('total-sheets')).toHaveText('1');
  await expect(page.getByTestId('sheet')).toHaveCount(1);
  await expect(page.locator('.sheet-diagram')).toBeVisible();
  await expect(page.locator('.sheet-piece')).toHaveCount(4);
  await expect(page.locator('.sheet-cut-line').first()).toBeVisible();

  // Test reload persistence
  await page.reload();
  await showResults(page, isMobile);
  await expect(page.getByTestId('total-sheets')).toHaveText('1');
  await expect(page.getByTestId('sheet')).toHaveCount(1);
});

test('sheet cutlist share link reproduces 2D project', async ({
  page,
  context,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, 'Mobile uses native share sheet');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('./');
  await page.getByRole('radio', { name: 'Sheets' }).click();

  const stockRow = page.getByTestId('stock-row').first();
  await stockRow.getByRole('textbox', { name: 'Length', exact: true }).fill('2440');
  await stockRow.getByRole('textbox', { name: 'Width', exact: true }).fill('1220');

  await page.getByRole('button', { name: 'Add part' }).first().click();
  const partRow = page.getByTestId('part-row').first();
  await partRow.getByRole('textbox', { name: 'Part', exact: true }).fill('Desk Top');
  await partRow.getByRole('textbox', { name: 'Length', exact: true }).fill('1600');
  await partRow.getByRole('textbox', { name: 'Width', exact: true }).fill('800');
  await partRow.getByRole('textbox', { name: 'Qty', exact: true }).fill('1');

  await expect(page.getByTestId('total-sheets')).toHaveText('1');

  await page.getByRole('button', { name: 'Share' }).first().click();
  await expect(page.getByText('Link copied')).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#Q');

  const fresh = await browser.newPage();
  await fresh.goto(url);
  await expect(fresh.getByTestId('total-sheets')).toHaveText('1');
  await expect(
    fresh.getByTestId('part-row').first().getByRole('textbox', { name: 'Part', exact: true }),
  ).toHaveValue('Desk Top');
  await fresh.close();
});

test('identical sheets are grouped and display 2 × in heading', async ({ page, isMobile }) => {
  await page.goto('./');
  if (isMobile) await page.getByRole('tab', { name: /Stock & parts/ }).click();

  await page.getByRole('radio', { name: 'Sheets' }).click();

  const stockRow = page.getByTestId('stock-row').first();
  await stockRow.getByRole('textbox', { name: 'Length', exact: true }).fill('2440');
  await stockRow.getByRole('textbox', { name: 'Width', exact: true }).fill('1220');

  await page.getByRole('button', { name: 'Add part' }).first().click();
  const partRow = page.getByTestId('part-row').first();
  await partRow.getByRole('textbox', { name: 'Part', exact: true }).fill('Shelf');
  await partRow.getByRole('textbox', { name: 'Length', exact: true }).fill('1200');
  await partRow.getByRole('textbox', { name: 'Width', exact: true }).fill('600');
  await partRow.getByRole('textbox', { name: 'Qty', exact: true }).fill('8');

  await showResults(page, isMobile);

  await expect(page.getByTestId('total-sheets')).toHaveText('2');
  await expect(page.getByTestId('sheet')).toHaveCount(1);
  await expect(page.getByTestId('sheet')).toContainText('2 × 2440 × 1220 mm');
  await expect(page.locator('.sheet-cut-line').first()).toBeVisible();
});
