import { expect, test } from '@playwright/test';

const RESPONSIVE_WIDTHS = [375, 390, 768, 1024, 1440] as const;

test('homepage stays within the viewport at every required responsive width', async ({ page }) => {
  for (const width of RESPONSIVE_WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto('/tiferet-carpentry/');
    await expect(page.getByRole('heading', { name: 'נגרות מדויקת. בתים מעוררי השראה.' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('mobile navigation covers the viewport and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tiferet-carpentry/');

  await page.getByRole('button', { name: 'פתיחת תפריט' }).click();
  const dialog = page.getByRole('dialog', { name: 'תפריט האתר' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'סגירת תפריט' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'כניסה לנגרייה המקצועית' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'סגירת תפריט' })).toBeFocused();

  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
    })
    .toEqual({ x: 0, y: 0, width: 390, height: 844 });

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'פתיחת תפריט' })).toBeFocused();
});
