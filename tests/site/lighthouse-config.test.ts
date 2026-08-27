import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Lighthouse production gates', () => {
  const source = readFileSync(resolve(process.cwd(), 'scripts/lighthouse.js'), 'utf8');

  it('uses only explicit audits so removed preset audits cannot produce invalid NaN failures', () => {
    expect(source).not.toContain("preset: 'lighthouse:no-pwa'");
  });

  it('retains the strict product performance thresholds', () => {
    expect(source).toContain("'categories:performance': ['error', { minScore: 0.9");
    expect(source).toContain("'first-contentful-paint': ['error', { maxNumericValue: 1200");
    expect(source).toContain("'largest-contentful-paint': ['error', { maxNumericValue: 2500");
    expect(source).toContain("'total-blocking-time': ['error', { maxNumericValue: 200");
    expect(source).toContain("'cumulative-layout-shift': ['error', { maxNumericValue: 0.1");
  });
});
