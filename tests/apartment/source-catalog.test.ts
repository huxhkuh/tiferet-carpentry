import { describe, expect, it } from 'vitest';
import { TIFERET_SOURCE_INVENTORY } from '../../src/apartment/data/tiferet-source-inventory';
import {
  getSourceBuildings,
  getSourceFloors,
  getSourcePlans,
  sourcePlanDriveUrl,
} from '../../src/apartment/source/catalog';

describe('Tiferet source-plan catalog', () => {
  it('derives both buildings, every floor and all 99 apartment plans from the audited inventory', () => {
    const buildings = getSourceBuildings(TIFERET_SOURCE_INVENTORY);
    const catalogCount = buildings.reduce(
      (total, building) =>
        total +
        getSourceFloors(TIFERET_SOURCE_INVENTORY, building.id).reduce(
          (floorTotal, floor) => floorTotal + getSourcePlans(TIFERET_SOURCE_INVENTORY, building.id, floor).length,
          0,
        ),
      0,
    );

    expect(buildings).toEqual([
      { id: 'techelet', name: 'תכלת' },
      { id: 'argaman', name: 'ארגמן' },
    ]);
    expect(catalogCount).toBe(99);
  });

  it('returns naturally ordered floor plans and a traceable Drive URL', () => {
    const plans = getSourcePlans(TIFERET_SOURCE_INVENTORY, 'techelet', 5);

    expect(plans.map((plan) => plan.sheet)).toEqual(['5-1', '5-2', '5-3', '5-4', '5-5', '5-6', '5-7']);
    expect(sourcePlanDriveUrl(plans[0]!)).toBe(
      'https://drive.google.com/file/d/1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq/view',
    );
  });
});
