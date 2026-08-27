import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const STORAGE_KEY = 'tiferet:design:5-1';

test('Tiferet wardrobe happy path persists after reload', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(
    ({ storageKey, resetGuard }) => {
      if (sessionStorage.getItem(resetGuard) === '1') return;
      localStorage.removeItem(storageKey);
      sessionStorage.setItem(resetGuard, '1');
    },
    { storageKey: STORAGE_KEY, resetGuard: 'tiferet:e2e-storage-reset' },
  );
  await page.goto('/tiferet-carpentry/apartments');

  await expect(page.getByRole('heading', { name: 'בחרו את דירת תפארת שלכם' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'מתחם / בניין' })).toHaveValue('techelet');
  await expect(page.getByRole('combobox', { name: 'קומה' })).toHaveValue('5');
  await expect(page.getByRole('combobox', { name: 'דירה' })).toHaveValue('source-techelet-5-1');
  await page.getByRole('link', { name: 'בחרו דירה' }).click();
  await expect(page).toHaveURL(/\/tiferet-carpentry\/my-apartment$/);
  await expect(page.getByRole('heading', { name: 'הדירה שלכם, במרכז התכנון' })).toBeVisible();
  await page.locator('a[href$="/design/bedroom"]').click();
  await expect(page).toHaveURL(/\/tiferet-carpentry\/design\/bedroom$/);

  await page.getByTestId('wall-list-bed-e').click();
  await expect(page.getByText('הקיר הנבחר: 300 ס״מ')).toBeVisible();
  await page.getByRole('button', { name: /^＋ הוסף ארון$/ }).click();
  await page.getByLabel('רוחב').fill('200');
  await expect(page.getByTestId(/cabinet-footprint-/)).toBeVisible();
  await page.getByRole('button', { name: 'שמור תכנון' }).click();
  await expect(page.getByRole('status')).toContainText('נשמר');
  await expect
    .poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY))
    .toContain('"width":2000');

  await page.reload();
  await expect(page.getByText('ארון אחד בתכנון')).toBeVisible();
  await page.getByRole('button', { name: 'הדמיית 3D' }).click();
  const canvas = page.getByTestId('apartment-3d-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-scene-cabinets', '1');
  await expect(canvas).toHaveAttribute('aria-label', /200×240×60 ס״מ/);
});

test('Tiferet furniture, layers and camera persist as one design', async ({ page }) => {
  await page.addInitScript(
    ({ storageKey, resetGuard }) => {
      if (sessionStorage.getItem(resetGuard) === '1') return;
      localStorage.removeItem(storageKey);
      sessionStorage.setItem(resetGuard, '1');
    },
    { storageKey: STORAGE_KEY, resetGuard: 'tiferet:furniture-e2e-storage-reset' },
  );
  await page.goto('/tiferet-carpentry/design/bedroom');

  await page.getByTestId('furniture-bedroom-bed-a').click();
  await page.getByRole('button', { name: 'הזז ימינה 10 ס״מ' }).click();
  await page.getByRole('button', { name: 'שכבת עיצוב והלבשה' }).click();
  await page.getByRole('button', { name: 'הדמיית 3D' }).click();
  await page.getByTestId('planner-canvas').getByRole('button', { name: 'סובב ימינה', exact: true }).click();
  await page.getByRole('button', { name: 'התקרב' }).click();
  await page.getByRole('button', { name: 'שמור תכנון' }).click();

  await page.reload();
  await expect(page.getByRole('button', { name: 'שכבת עיצוב והלבשה' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('furniture-bedroom-bed-a').click();
  await expect(page.getByLabel(/מיקום X/)).toHaveValue('380');
  await page.getByRole('button', { name: 'הדמיית 3D' }).click();
  const canvas = page.getByTestId('apartment-3d-canvas');
  await expect(canvas).toHaveAttribute('data-camera-yaw', '2.82');
  await expect(canvas).toHaveAttribute('data-camera-zoom', '0.89');
});

test('Tiferet picker and planner pass WCAG 2.1 AA checks', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/tiferet-carpentry/');
  const siteResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(siteResults.violations).toHaveLength(0);

  await page.goto('/tiferet-carpentry/design/bedroom');
  const plannerResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(plannerResults.violations).toHaveLength(0);

  await page.getByRole('button', { name: 'תצוגה מלאה' }).click();
  const completeViewResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(completeViewResults.violations).toHaveLength(0);
});

test('Tiferet planner has no horizontal overflow on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tiferet-carpentry/design/bedroom');

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Tiferet furnished rooms switch between two beds, kitchen and an empty planning view', async ({ page }) => {
  await page.goto('/tiferet-carpentry/design/bedroom');

  await expect(page.getByTestId('furniture-bedroom-bed-a')).toBeVisible();
  await expect(page.getByTestId('furniture-bedroom-bed-b')).toBeVisible();
  await page.getByRole('button', { name: 'הדמיית 3D' }).click();
  await expect(page.getByTestId('apartment-3d-canvas')).toHaveAttribute('data-scene-beds', '2');

  await page.getByRole('switch', { name: 'הצג ריהוט מלא' }).click();
  await expect(page.getByTestId('apartment-3d-canvas')).toHaveAttribute('data-scene-furniture', '0');
  await page.getByRole('switch', { name: 'הצג ריהוט מלא' }).click();
  await page.getByRole('button', { name: 'מרווה' }).click();
  await page.getByTestId('room-select-kitchen').click();

  const kitchenCanvas = page.getByTestId('apartment-3d-canvas');
  await expect(kitchenCanvas).toHaveAttribute('data-scene-furniture', '5');
  await expect(kitchenCanvas).toHaveAttribute('aria-label', /עבור מטבח.*5 פריטי ריהוט/);
});

test('Tiferet complete view serves the untouched full-resolution source sheet', async ({ page }) => {
  await page.goto('/tiferet-carpentry/design/bedroom');
  await page.getByRole('button', { name: 'תצוגה מלאה' }).click();

  const sourceSheet = page.getByRole('img', { name: 'גיליון 5-1 המקורי במלואו' });
  await expect(sourceSheet).toBeVisible();
  await expect.poll(() => sourceSheet.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(6300);
  await expect.poll(() => sourceSheet.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(3314);

  await page.getByRole('button', { name: '100% — פיקסל מול פיקסל' }).click();
  await expect(sourceSheet).toHaveCSS('max-width', 'none');
  await expect(page.getByRole('link', { name: 'פתח PDF מקורי' })).toHaveAttribute(
    'href',
    '/tiferet-carpentry/tiferet/sheet-5-1-original.pdf',
  );
});
