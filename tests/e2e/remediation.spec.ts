import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { PlanningDocument } from '../../src/apartment/persistence/planning-document';

test('cabinet and furniture locks survive reload and portable export', async ({ page }) => {
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.getByTestId('furniture-bedroom-bed-a').click();
  await page.getByRole('button', { name: 'נעילת הפריט', exact: true }).click();
  await expect(page.getByRole('button', { name: 'הזז ימינה 10 ס״מ' })).toBeDisabled();
  await page.getByTestId('wall-list-bed-e').click();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await page.getByRole('button', { name: 'נעילת הפריט', exact: true }).click();
  await expect(page.getByLabel('רוחב', { exact: true })).toBeDisabled();
  await expect(page.getByRole('status', { name: 'מצב שמירה' })).toContainText('נשמרה');
  await page.reload();
  await page.getByTestId('wall-list-bed-e').click();
  await expect(page.getByLabel('רוחב', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'שחרור נעילת הפריט', exact: true }).click();
  await page.getByLabel('רוחב', { exact: true }).fill('200');
  await page.getByLabel('רוחב', { exact: true }).press('Tab');
  await page.getByTestId('furniture-bedroom-bed-a').click();
  await expect(page.getByRole('button', { name: 'הזז ימינה 10 ס״מ' })).toBeDisabled();
  await page.getByRole('button', { name: 'גרסאות ושיתוף', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /ייצוא התכנון ל.*JSON/ }).click();
  const file = await (await downloadEvent).path();
  const document: PlanningDocument = JSON.parse(await readFile(file!, 'utf8'));
  expect(document.draft?.visibility.lockedObjectIds).toEqual(['bedroom-bed-a']);
});

test('all workshop locale choices retain text and the correct reading direction', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tiferet-carpentry/?app=workshop');
  for (const locale of ['he', 'ar', 'de', 'es', 'fr', 'en']) {
    await page.locator('header select:visible').selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', ['he', 'ar'].includes(locale) ? 'rtl' : 'ltr');
    await expect(page.getByRole('tab').first()).not.toHaveText('');
    await expect(page.locator('body')).not.toContainText('undefined');
  }
  expect(errors).toEqual([]);
});

test('mobile editing keeps the model visible and summary reads the current draft', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.getByRole('button', { name: 'נגרות ומידות', exact: true }).click();
  await page.getByTestId('wall-list-bed-e').click();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await page.getByLabel('רוחב', { exact: true }).fill('200');
  await page.getByLabel('רוחב', { exact: true }).press('Tab');
  await expect(page.getByRole('status', { name: 'מצב שמירה' })).toHaveText('הטיוטה נשמרה במכשיר');
  const canvas = await page.getByTestId('planner-canvas').boundingBox();
  const inspector = await page.locator('#planner-inspector').boundingBox();
  expect(canvas).not.toBeNull();
  expect(inspector).not.toBeNull();
  expect(canvas!.height).toBeGreaterThan(120);
  expect(canvas!.y + canvas!.height).toBeLessThanOrEqual(inspector!.y + 1);
  expect(inspector!.y + inspector!.height).toBeLessThanOrEqual(845);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.getByRole('button', { name: 'הדמיית 3D', exact: true }).click();
  await expect(page.getByTestId('apartment-3d-canvas')).toHaveAttribute('data-renderer-status', /ready|unavailable/);
  await page.getByRole('button', { name: 'פעולות', exact: true }).click();
  await page.getByRole('button', { name: 'סיכום', exact: true }).click();
  await expect(page).toHaveURL(/\/summary/);
  await expect(page.getByText(/200.*240.*60/).first()).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: 'חדרים וריהוט', exact: true }).click();
  await page.getByTestId(/cabinet-placement-/).click();
  await expect(page.getByLabel('רוחב', { exact: true })).toHaveValue('200');
});

test('blocked storage gives a recoverable draft and never reports successful saving', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'QuotaExceededError');
    };
  });
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.getByTestId('wall-list-bed-e').click();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await page.getByLabel('רוחב', { exact: true }).fill('200');
  await expect(page.getByRole('status', { name: 'מצב שמירה' })).toContainText('לא נשמרה');
  await page.getByRole('button', { name: 'סיכום', exact: true }).click();
  await expect(page).toHaveURL(/\/design\/bedroom/);
  await expect(page.getByRole('dialog')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /ייצוא.*JSON|הורד.*JSON|ייצוא התכנון/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
});

test('3D context loss exposes a working 2D recovery action', async ({ page }) => {
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.getByRole('button', { name: 'הדמיית 3D', exact: true }).click();
  const canvas = page.getByTestId('apartment-3d-canvas');
  await expect(canvas).toHaveAttribute('data-renderer-status', /ready|unavailable/);
  // Dispatch the browser lifecycle event; the same handler also receives a real GPU loss.
  await canvas.dispatchEvent('webglcontextlost', { cancelable: true });
  await expect(page.getByTestId('apartment-3d-fallback')).toBeVisible();
  await page.getByRole('button', { name: 'מעבר לתצוגת 2D' }).click();
  await expect(page.getByRole('button', { name: 'תצוגה נקייה', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('the registered site shell opens the planner while offline', async ({ page, context }) => {
  test.setTimeout(60_000);
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('planner-canvas')).toBeVisible();
  await page.getByTestId('wall-list-bed-e').click();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await expect(page.getByLabel('רוחב', { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test('portable JSON restores its apartment and live draft in an empty browser', async ({ page, browser }) => {
  test.setTimeout(60_000);
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.getByTestId('wall-list-bed-e').click();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await page.getByLabel('רוחב', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'גרסאות ושיתוף', exact: true }).click();
  await page.getByLabel('הערות לתכנון').fill('בדיקת מעבר למכשיר חדש');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ייצוא התכנון ל‑JSON' }).click();
  const file = await (await download).path();
  const document: PlanningDocument = JSON.parse(await readFile(file!, 'utf8'));
  // Use a second apartment identity to prove that geometry travels with the file.
  const apartmentId = 'portable-apartment';
  document.apartment = { ...document.apartment, id: apartmentId, name: 'דירת בדיקת שיתוף' };
  document.apartment.source = { ...document.apartment.source, sourceFileId: 'portable-source' };
  document.draft = {
    ...document.draft!,
    apartmentId,
    placements: document.draft!.placements.map((placement) => ({ ...placement, apartmentId })),
  };
  document.library = {
    ...document.library,
    apartmentId,
    designs: document.library.designs.map((design) => ({
      ...design,
      apartmentId,
      placements: design.placements.map((placement) => ({ ...placement, apartmentId })),
    })),
  };
  const fresh = await browser.newContext();
  try {
    const restored = await fresh.newPage();
    await restored.goto(page.url());
    await restored.getByRole('button', { name: 'גרסאות ושיתוף', exact: true }).click();
    await restored.getByLabel('ייבוא תכנון JSON').setInputFiles({
      name: 'shared.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
    await expect(restored).toHaveURL(/apartment=portable-apartment/);
    await restored.getByRole('button', { name: 'חדר שינה', exact: true }).click();
    await restored.getByTestId(/cabinet-placement-/).click();
    await expect(restored.getByLabel('רוחב', { exact: true })).toHaveValue('200');
    await restored.getByRole('button', { name: 'גרסאות ושיתוף', exact: true }).click();
    await expect(restored.getByLabel('הערות לתכנון')).toHaveValue('בדיקת מעבר למכשיר חדש');
    await restored.getByRole('button', { name: 'סגירת ספריית גרסאות', exact: true }).click();
    await restored.reload();
    await expect(restored.getByText('ארון אחד בתכנון')).toBeVisible();
    await restored.goto(new URL('/tiferet-carpentry/apartments', page.url()).href);
    await expect(restored.getByRole('link', { name: 'פתחו דירת בדיקת שיתוף' })).toBeVisible();
  } finally {
    await fresh.close();
  }
});
