import { expect, test, type Page } from '@playwright/test';

async function addPart(page: Page, label: string, length: string, qty: string) {
  await page.getByRole('button', { name: 'Add part' }).first().click();
  const row = page.getByTestId('part-row').last();
  await row.getByRole('textbox', { name: 'Part', exact: true }).fill(label);
  await row.getByRole('textbox', { name: 'Length', exact: true }).fill(length);
  await row.getByRole('textbox', { name: 'Qty', exact: true }).fill(qty);
}

async function showResults(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('tab', { name: /Cutlist|Skæreliste/ }).click();
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
  await expect(page.locator('.cuts input')).toHaveCount(0);
  const stock = page.getByTestId('board').first().getByRole('checkbox');
  await expect(stock).toHaveCount(1);
  const blanks = page.locator('.blank-board');
  await expect(blanks.first()).toBeVisible();
  expect(await blanks.count()).toBeGreaterThan(1);
  for (const blank of await blanks.all()) {
    await expect(blank.getByRole('checkbox')).toHaveCount(1);
  }
  const complete = blanks.first().getByRole('checkbox', { name: /^B1 ·/ });
  await complete.check();
  await expect(complete).toBeChecked();
  await expect(blanks.first().locator('.board-title')).toHaveCSS(
    'text-decoration-line',
    'line-through',
  );
  await expect(stock).not.toBeChecked();
  await expect(blanks.nth(1).getByRole('checkbox')).not.toBeChecked();
  await stock.check();
  await complete.uncheck();
  await expect(complete).not.toBeChecked();
  await expect(stock).toBeChecked();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await complete.focus();
  await page.keyboard.press('Space');
  await expect(complete).toBeChecked();
  await expect(blanks.first().locator('.board-checkmark')).toHaveCSS(
    'animation-duration',
    '1e-05s',
  );
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
  await complete.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('blanks-completed.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(blanks.first().locator('.board-checkmark')).toBeVisible();
  await expect(blanks.first().locator('input[type="checkbox"]')).toBeChecked();
  await page.screenshot({
    path: test.info().outputPath('blanks-completed-print.png'),
    fullPage: true,
  });
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
  expect(url).toContain('#Q');

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

test('pasting spreadsheet rows adds parts', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Add part' }).first().click();
  await page
    .getByTestId('part-row')
    .last()
    .getByRole('textbox', { name: 'Part', exact: true })
    .focus();
  await page.evaluate((text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    document.activeElement!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, 'Name\tLength\tQty\nLeg\t700\t6\nRail\t500\t4\n');
  await expect(page.getByTestId('part-row')).toHaveCount(2);
  await expect(page.getByText('Added 2 parts')).toBeVisible();
  await showResults(page, isMobile);
  await expect(page.getByTestId('total-boards')).toHaveText('3');
});

test.describe('in Danish', () => {
  test.use({ locale: 'da-DK' });

  test('speaks Danish and reads decimal commas', async ({ page, isMobile }) => {
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Tilføj del' })).toBeVisible();
    await page.getByRole('button', { name: 'Tilføj del' }).click();
    const row = page.getByTestId('part-row').last();
    await row.getByRole('textbox', { name: 'Længde', exact: true }).fill('1100,5');
    await row.getByRole('textbox', { name: 'Antal', exact: true }).fill('2');
    await showResults(page, isMobile);
    await expect(page.getByTestId('total-boards')).toHaveText('1');
    await expect(page.locator('.cut-text').first()).toContainText('1100,5 mm');
  });

  test('can switch language', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('combobox', { name: 'Sprog' }).selectOption('en');
    await expect(page.getByRole('button', { name: 'Add part' })).toBeVisible();
  });
});

test('identical boards are listed once', async ({ page, isMobile }) => {
  await page.goto('./');
  await addPart(page, 'Leg', '700', '6');
  await showResults(page, isMobile);
  await expect(page.getByTestId('total-boards')).toHaveText('2');
  await expect(page.getByTestId('board')).toHaveCount(1);
  await expect(page.getByTestId('board')).toContainText('2 × 2400 mm');
  const board = page.getByTestId('board');
  const complete = board.getByRole('checkbox', { name: '#1 · 2 × 2400 mm' });
  await expect(board.getByRole('checkbox')).toHaveCount(1);
  await expect(page.locator('.cuts input')).toHaveCount(0);
  await complete.check();
  await expect(complete).toBeChecked();
  await expect(board.locator('.cut-text')).toHaveText('3 × 700 mm');
  await complete.uncheck();
  await expect(complete).not.toBeChecked();
});

test('stock completion supports keyboard, reduced motion and print', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await addPart(page, 'Leg', '700', '6');
  await showResults(page, isMobile);
  const board = page.getByTestId('board');
  const complete = board.getByRole('checkbox');
  await expect(complete).toHaveCount(1);
  await complete.focus();
  await page.keyboard.press('Space');
  await expect(complete).toBeChecked();
  await expect(board.locator('.board-title')).toHaveCSS('text-decoration-line', 'line-through');
  await expect(board.locator('.board-checkmark')).toHaveCSS('animation-duration', '1e-05s');
  const bounds = await complete.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
  await expect(board).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  await page.screenshot({ path: test.info().outputPath('stock-completed.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(board.locator('.board-checkmark')).toBeVisible();
  await expect(board.locator('.board-checkmark')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(board.locator('.cut-text')).toHaveText('3 × 700 mm');
  await page.screenshot({
    path: test.info().outputPath('stock-completed-print.png'),
    fullPage: true,
  });
});

test('the printout carries a QR code back to the project', async ({ page, isMobile }) => {
  await page.goto('./');
  await addPart(page, 'Leg', '700', '2');
  await showResults(page, isMobile);
  await expect(page.getByTestId('total-boards')).toHaveText('1');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-qr svg')).toBeVisible();
  await expect(page.locator('.print-qr')).toContainText('Scan to open this project');
});
