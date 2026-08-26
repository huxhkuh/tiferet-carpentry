import { describe, expect, it } from 'vitest';

import { buildAppModeUrl, readAppMode } from '../../src/utils/app-mode';

describe('application mode routing', () => {
  it.each([
    ['', 'site'],
    ['?app=planner', 'site'],
    ['?app=workshop', 'workshop'],
    ['?app=unknown', 'site'],
  ] as const)('maps %s to %s', (search, expected) => {
    expect(readAppMode(search)).toBe(expected);
  });

  it('preserves unrelated query parameters when changing mode', () => {
    expect(buildAppModeUrl('?tab=preview&app=workshop', 'site')).toBe('?tab=preview');
    expect(buildAppModeUrl('?tab=preview', 'workshop')).toBe('?tab=preview&app=workshop');
  });
});
