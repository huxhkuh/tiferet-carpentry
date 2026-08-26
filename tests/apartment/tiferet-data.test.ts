import { describe, expect, it } from 'vitest';
import { TIFERET_5_1, TIFERET_PROJECT } from '../../src/apartment/data/tiferet';
import { wallLength } from '../../src/apartment/geometry/wall-frame';
import { validateApartment, validateProject } from '../../src/apartment/validation/apartment';

const wallLengthById = (id: string): number => {
  const wall = TIFERET_5_1.walls.find((candidate) => candidate.id === id);
  if (!wall) throw new Error(`Missing wall ${id}`);
  return wallLength(wall);
};

const roomBounds = (id: string) => {
  const room = TIFERET_5_1.rooms.find((candidate) => candidate.id === id);
  if (!room) throw new Error(`Missing room ${id}`);
  const xs = room.polygon.map((point) => point.x);
  const ys = room.polygon.map((point) => point.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
};

describe('Tiferet apartment 5-1 normalized source model', () => {
  it('is a valid extensible project graph with all labelled rooms from the sales plan', () => {
    expect(validateApartment(TIFERET_5_1)).toBe(true);
    expect(validateProject(TIFERET_PROJECT)).toBe(true);
    expect(TIFERET_5_1.rooms.map((room) => room.name)).toEqual(
      expect.arrayContaining([
        'מטבח',
        'אמבטיה',
        'חדר שינה',
        'חדר שינה הורים',
        'ממ״ד',
        'חדר רחצה',
        'מסתור כביסה',
        'סלון',
      ]),
    );
  });

  it('preserves the inspected PDF provenance in the apartment definition', () => {
    expect(TIFERET_5_1.source).toMatchObject({
      sheet: '5-1',
      sourceFileId: '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq',
      sourceSha256: '2165ED6217A04A5A56AC00B5B3DBF0AC477F6224884CFD1A513FCF6B478F6DBE',
      sourcePage: 1,
      pageWidthPoints: 2268,
      pageHeightPoints: 1193,
      modelingMethod: 'semi-automatic',
    });
  });

  it('anchors every measured room to the official PDF vector coordinates', () => {
    expect(roomBounds('safe-room')).toEqual({ left: 0, right: 2_950, top: 108, bottom: 3_158 });
    expect(roomBounds('bedroom')).toEqual({ left: 3_244, right: 5_944, top: 0, bottom: 3_000 });
    expect(roomBounds('master')).toEqual({ left: 0, right: 3_850, top: 5_108, bottom: 8_058 });
    expect(roomBounds('bath')).toEqual({ left: 3_977, right: 6_267, top: 5_137, bottom: 6_837 });
    expect(roomBounds('kitchen')).toEqual({ left: 5_644, right: 9_494, top: 8_450, bottom: 10_150 });
  });

  it('retains the 48 wall masses extracted from the source PDF instead of redrawing generic strokes', () => {
    const wallMasses = (
      TIFERET_5_1 as unknown as {
        wallMasses?: Array<{ polygon: Array<{ x: number; y: number }>; sourcePdfRect?: object }>;
      }
    ).wallMasses;

    expect(wallMasses).toHaveLength(48);
    expect(wallMasses?.every((mass) => mass.polygon.length === 4 && mass.sourcePdfRect)).toBe(true);
  });

  it('positions the balcony from the same source-vector crop instead of a generic apartment-wide box', () => {
    const balcony = TIFERET_5_1.fixedElements.find((element) => element.id === 'sales-plan-balcony');
    const xs = balcony?.polygon.map((point) => point.x) ?? [];
    const ys = balcony?.polygon.map((point) => point.y) ?? [];

    expect({ left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }).toEqual({
      left: 3_096,
      right: 9_594,
      top: -3_050,
      bottom: -300,
    });
  });

  it.each([
    ['bed-n', 2_700],
    ['bed-e', 3_000],
    ['safe-n', 2_950],
    ['safe-e', 3_050],
    ['master-s', 3_850],
    ['master-e', 2_950],
    ['living-n', 3_450],
    ['living-e', 8_450],
    ['shower-n', 1_650],
    ['shower-e', 1_600],
    ['bath-n', 2_290],
    ['bath-s', 2_290],
    ['kitchen-s', 3_850],
    ['kitchen-e', 1_700],
  ])('keeps the sales-plan dimension for %s', (wallId, expectedLength) => {
    expect(wallLengthById(wallId)).toBe(expectedLength);
  });

  it('preserves the connected, stepped topology of the official plan instead of a room grid', () => {
    const safe = roomBounds('safe-room');
    const bedroom = roomBounds('bedroom');
    const shower = roomBounds('shower');
    const master = roomBounds('master');
    const bath = roomBounds('bath');
    const laundry = roomBounds('laundry');
    const kitchen = roomBounds('kitchen');

    expect(bedroom.left - safe.right).toBeLessThanOrEqual(350);
    expect(shower.top - safe.bottom).toBeLessThanOrEqual(350);
    expect(master.top - shower.bottom).toBeLessThanOrEqual(350);
    expect(bath.left - master.right).toBeLessThanOrEqual(350);
    expect(kitchen.top - master.bottom).toBe(392);
    expect(laundry.bottom).toBe(kitchen.bottom);
    expect(TIFERET_5_1.rooms.some((room) => room.id === 'guest-wc')).toBe(true);
  });

  it('models the central bathroom as the 229 by 170 cm rectangle shown in the source', () => {
    const bath = TIFERET_5_1.rooms.find((room) => room.id === 'bath');

    expect(bath?.polygon).toHaveLength(4);
    expect(bath?.wallIds).toEqual(['bath-n', 'bath-e', 'bath-s', 'bath-w']);
    expect(wallLengthById('bath-n')).toBe(2_290);
    expect(wallLengthById('bath-e')).toBe(1_700);
  });
});
