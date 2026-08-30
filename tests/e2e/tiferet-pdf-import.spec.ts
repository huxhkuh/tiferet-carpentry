import { expect, test } from '@playwright/test';
import path from 'node:path';

const IMPORT_STORAGE_KEY = 'tiferet:imported-apartments:v1';
const RESET_GUARD = 'tiferet:pdf-import-e2e-reset';

test('imports an architectural PDF and restores the edited design after reload', async ({ page }) => {
  test.setTimeout(90_000);

  await page.addInitScript(
    ({ storageKey, resetGuard }) => {
      if (sessionStorage.getItem(resetGuard) === '1') return;
      localStorage.removeItem(storageKey);
      sessionStorage.setItem(resetGuard, '1');
    },
    { storageKey: IMPORT_STORAGE_KEY, resetGuard: RESET_GUARD },
  );
  await page.goto('/tiferet-carpentry/import');

  await page.locator('input[type="file"]').setInputFiles(path.resolve('public/tiferet/sheet-5-1-original.pdf'));
  await expect(page.getByRole('heading', { name: 'תוצאות הזיהוי' })).toBeVisible();
  await expect(page.getByText('392', { exact: true })).toBeVisible();

  const vectorPreview = page.getByRole('img', { name: 'גאומטריה וקטורית שזוהתה בתוכנית' });
  const previewBounds = await vectorPreview.boundingBox();
  expect(previewBounds).not.toBeNull();
  if (previewBounds === null) return;

  await vectorPreview.click({ position: { x: previewBounds.width * 0.25, y: previewBounds.height * 0.5 } });
  await vectorPreview.click({ position: { x: previewBounds.width * 0.35, y: previewBounds.height * 0.5 } });
  await page.getByLabel('מידה (ס״מ)').fill('300');
  await page.getByRole('button', { name: 'חשבו קנה מידה' }).click();
  await expect(page.getByText(/כיול פעיל:/)).toBeVisible();

  await page.getByLabel('חלל 1').fill('חדר שינה מיובא');
  await page.getByRole('button', { name: 'אשרו טיוטה ופתחו במתכנן' }).click();
  await expect(page).toHaveURL(/\/tiferet-carpentry\/design\/import-room-1\?apartment=imported-pdf-/u);
  await expect(page.getByText('חדר שינה מיובא', { exact: true }).first()).toBeVisible();

  await page.locator('[data-testid^="wall-list-"]').first().click();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await page.getByLabel('רוחב').fill('200');
  await expect(page.getByTestId(/cabinet-footprint-/)).toBeVisible();
  await page.getByRole('button', { name: 'שמור תכנון' }).click();
  await expect(page.getByRole('status')).toContainText('נשמר');

  await page.reload();
  await expect(page.getByText('ארון אחד בתכנון')).toBeVisible();
  await page.getByTestId(/cabinet-placement-/).click();
  await expect(page.getByLabel('רוחב')).toHaveValue('200');
});
