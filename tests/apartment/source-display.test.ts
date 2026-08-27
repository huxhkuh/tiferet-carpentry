import { describe, expect, it } from 'vitest';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import { apartmentSourceLabel } from '../../src/apartment/source/display';

describe('apartment source display identity', () => {
  it('distinguishes the title-block apartment number from the source sheet', () => {
    expect(apartmentSourceLabel(TIFERET_5_1)).toBe('דירה 23-א · גיליון 5-1');
  });

  it('falls back to the legacy apartment name when the title block was not resolved', () => {
    expect(
      apartmentSourceLabel({
        ...TIFERET_5_1,
        source: { ...TIFERET_5_1.source, sourceApartmentNumber: undefined },
      }),
    ).toBe('דירה 5-1');
  });
});
