import { describe, expect, it } from 'vitest';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import { furnitureFootprint } from '../../src/apartment/furniture/geometry';
import { cabinetFootprint } from '../../src/apartment/geometry/placement';
import type { Apartment, FurniturePlacement } from '../../src/apartment/types';
import { validateApartment } from '../../src/apartment/validation/apartment';

describe('Tiferet furniture model', () => {
  it('keeps the two single beds separate inside the bedroom', () => {
    const beds = (TIFERET_5_1.furniture ?? []).filter(
      (item) => item.roomId === 'bedroom' && item.kind === 'single-bed',
    );

    expect(beds).toHaveLength(2);
    const [first, second] = beds;
    expect(first.x + first.width / 2).toBeLessThan(second.x - second.width / 2);
  });

  it('keeps a visible clearance between both beds and an east-wall wardrobe', () => {
    const bedroom = TIFERET_5_1.rooms.find((room) => room.id === 'bedroom');
    const eastWall = TIFERET_5_1.walls.find((wall) => wall.id === 'bed-e');
    if (!bedroom || !eastWall) throw new Error('Missing bedroom geometry');
    const beds = (TIFERET_5_1.furniture ?? []).filter(
      (item) => item.roomId === bedroom.id && item.kind === 'single-bed',
    );
    const wardrobe = cabinetFootprint(eastWall, 0, 1_800, 600, bedroom);
    const wardrobeInnerEdge = Math.min(...wardrobe.map((point) => point.x));
    const closestBedEdge = Math.max(...beds.flatMap((bed) => furnitureFootprint(bed).map((point) => point.x)));

    expect(wardrobeInnerEdge - closestBedEdge).toBeGreaterThanOrEqual(250);
  });

  it('includes the complete kitchen visualization set', () => {
    const kitchenKinds = (TIFERET_5_1.furniture ?? [])
      .filter((item) => item.roomId === 'kitchen')
      .map((item) => item.kind);

    expect(kitchenKinds).toEqual(
      expect.arrayContaining(['kitchen-base-run', 'kitchen-wall-run', 'sink', 'oven', 'refrigerator']),
    );
  });

  it('calculates an immutable rotated furniture footprint', () => {
    const furniture: FurniturePlacement = {
      id: 'rotated-desk',
      roomId: 'room',
      kind: 'desk',
      label: 'שולחן',
      x: 300,
      y: 400,
      width: 100,
      depth: 200,
      height: 750,
      elevation: 0,
      rotation: Math.PI / 2,
    };

    expect(furnitureFootprint(furniture)).toEqual([
      { x: 400, y: 350 },
      { x: 400, y: 450 },
      { x: 200, y: 450 },
      { x: 200, y: 350 },
    ]);
    expect(furniture).toMatchObject({ x: 300, y: 400, rotation: Math.PI / 2 });
  });

  it('rejects furniture that references an unknown room', () => {
    const firstFurniture = TIFERET_5_1.furniture?.[0];
    if (!firstFurniture) throw new Error('Missing furniture fixture');
    const apartment: Apartment = {
      ...TIFERET_5_1,
      furniture: [{ ...firstFurniture, roomId: 'missing-room' }],
    };

    expect(validateApartment(apartment)).toBe(false);
  });
});
