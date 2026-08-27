import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type BundleBudgetConfig = {
  readonly perFileKB: Readonly<Record<string, number>>;
  readonly totalAllKB: number;
  readonly totalCssKB: number;
  readonly totalJsKB: number;
};

describe('production bundle budget configuration', () => {
  it('gives the on-demand PDF export boundary the existing PDF renderer ceiling', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'config/bundle-budget.json'), 'utf8'),
    ) as BundleBudgetConfig;

    expect(config.perFileKB['PdfExportPanel']).toBe(config.perFileKB['pdf-renderer']);
    expect(config.perFileKB['PdfExportPanel']).toBe(1600);
  });

  it('keeps the aggregate application budgets tight', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'config/bundle-budget.json'), 'utf8'),
    ) as BundleBudgetConfig;

    expect(config.totalJsKB).toBe(2850);
    expect(config.totalCssKB).toBe(110);
    expect(config.totalAllKB).toBe(3050);
  });
});
