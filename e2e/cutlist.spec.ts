import { expect, test, type Page } from '@playwright/test';

async function addPart(page: Page, label: string, length: string, qty: string) {
  await page.getByRole('button', { name: 'Add part' }).first().click();
  const row = page.getByTestId('part-row').last();
  await row.getByRole('textbox', { name: 'Part', exact: true }).fill(label);
  await row.getByRole('textbox', { name: 'Length', exact: true }).fill(length);
  await row.getByRole('textbox', { name: 'Qty', exact: true }).fill(qty);
}

async function showResults(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('tab', { name: /Cutlist/ }).click();
}

test('builds a cutlist that survives a reload', async ({ page, isMobile }) => {
  await page.goto('./');
  await showResults(page, isMobile);
  await expect(page.getByText('Nothing to cut yet')).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: /Stock & parts/ }).click();

  await addPart(page, 'Leg', '700', '6');
  await addPart(page, 'Rail', '500', '4');

  await showResults(page, isMobile);
  await expect(page.getByTestId('total-boards')).toHaveText('3');
  await expect(page.getByTestId('board')).toHaveCount(3);

  await page.reload();
  await showResults(page, isMobile);
  await expect(page.getByTestId('total-boards')).toHaveText('3');
});

test('loads the example and plans planing blanks', async ({ page, isMobile }) => {
  await page.goto('./');
  await showResults(page, isMobile);
  await page.getByRole('button', { name: 'Show me an example' }).click();
  await expect(page.getByText('Plane, then cut blanks to parts')).toBeVisible();
});

test('share links reproduce the project', async ({ page, context, browser, isMobile }) => {
  test.skip(isMobile, 'Mobile uses the native share sheet');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await addPart(page, 'Shelf', '700', '5');
  await expect(page.getByTestId('total-boards')).toHaveText('2');

  await page.getByRole('button', { name: 'Share' }).first().click();
  await expect(page.getByText('Link copied')).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#p=');

  const fresh = await browser.newPage();
  await fresh.goto(url);
  await expect(fresh.getByTestId('total-boards')).toHaveText('2');
  await expect(
    fresh.getByTestId('part-row').first().getByRole('textbox', { name: 'Part', exact: true }),
  ).toHaveValue('Shelf');
  await fresh.close();
});

test('undo restores a removed part', async ({ page }) => {
  await page.goto('./');
  await addPart(page, 'Leg', '700', '2');
  await page.getByRole('button', { name: 'Remove part' }).click();
  await expect(page.getByTestId('part-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('part-row')).toHaveCount(1);
});
