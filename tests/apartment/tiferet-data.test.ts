import { describe, expect, it } from 'vitest';
import { TIFERET_5_1, TIFERET_PROJECT } from '../../src/apartment/data/tiferet';
import { wallLength } from '../../src/apartment/geometry/wall-frame';
import { validateApartment, validateProject } from '../../src/apartment/validation/apartment';
import type { MeasurementEvidence, Point } from '../../src/apartment/types';

interface AuditedRoomDimension {
  id: string;
  label: string;
  value: number;
  evidence: MeasurementEvidence;
}

interface AuditedFixture {
  id: string;
  roomId: string;
  kind: string;
  polygon: Point[];
  trace?: { confidence: string };
}

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
      measurementBasis: 'construction',
      geometryStatus: 'partially-modeled',
      mathematicalVerification: 'pending',
      visualVerification: 'pending',
      sourceApartmentNumber: '23-א',
      sourceBuildingType: 'תכלת א',
      sourceRoomCount: 4,
      sourceAreaSqm: 97.4,
      sourceCoveredBalconyAreaSqm: 17.8,
      sourceSukkahBalconyAreaSqm: 3.3,
      sourceScale: '1 : 50',
      sourceEdition: 1,
      sourceDate: '17.03.26',
    });
    expect(TIFERET_5_1.source.unresolvedFields).toEqual(
      expect.arrayContaining([
        'wall-heights',
        'door-heights',
        'window-heights',
        'window-sill-heights',
        'ceiling-heights',
      ]),
    );
  });

  it('distinguishes source geometry from renderer-only presentation defaults', () => {
    expect(TIFERET_5_1.walls.every((wall) => wall.trace?.sourceFileId === TIFERET_5_1.source.sourceFileId)).toBe(true);
    expect(TIFERET_5_1.walls.every((wall) => wall.trace?.sourcePage === 1)).toBe(true);
    expect(TIFERET_5_1.walls.every((wall) => wall.measurements?.height === undefined)).toBe(true);
    expect(
      TIFERET_5_1.walls.flatMap((wall) => wall.openings).every((opening) => opening.measurements?.height === undefined),
    ).toBe(true);
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

  it('stores printed room dimensions as explicit evidence instead of deriving labels from bounding boxes', () => {
    const expected = new Map([
      ['safe-room', [2_950, 3_050]],
      ['bedroom', [2_700, 3_000]],
      ['living', [3_450, 8_450]],
      ['shower', [1_650, 1_600]],
      ['guest-wc', [1_500, 900]],
      ['master', [3_850, 2_950]],
      ['bath', [2_290, 1_700]],
      ['kitchen', [3_850, 1_700]],
    ]);

    for (const [roomId, values] of expected) {
      const room = TIFERET_5_1.rooms.find((candidate) => candidate.id === roomId) as
        ({ dimensions?: AuditedRoomDimension[] } & (typeof TIFERET_5_1.rooms)[number]) | undefined;
      expect(room?.dimensions?.map((dimension) => dimension.value)).toEqual(values);
      expect(room?.dimensions?.every((dimension) => dimension.evidence.origin === 'explicit')).toBe(true);
      expect(room?.dimensions?.every((dimension) => dimension.evidence.confidence === 'high')).toBe(true);
    }
  });

  it('keeps unavailable vertical measurements unknown instead of persisting viewer defaults as source facts', () => {
    expect(TIFERET_5_1.walls.every((wall) => wall.height === undefined)).toBe(true);
    expect(
      TIFERET_5_1.walls
        .flatMap((wall) => wall.openings)
        .every(
          (opening) => opening.height === undefined && (opening.kind !== 'window' || opening.sillHeight === undefined),
        ),
    ).toBe(true);
  });

  it('uses vector-traced wall thicknesses and does not flatten reinforced and internal walls to one value', () => {
    const thicknesses = new Set(TIFERET_5_1.walls.map((wall) => wall.thickness));

    expect(thicknesses.size).toBeGreaterThan(3);
    expect(TIFERET_5_1.walls.find((wall) => wall.id === 'safe-w')?.thickness).toBeGreaterThan(250);
    expect(TIFERET_5_1.walls.find((wall) => wall.id === 'bed-e')?.thickness).toBe(100);
    expect(TIFERET_5_1.walls.every((wall) => wall.measurements?.thickness?.origin === 'vector-traced')).toBe(true);
  });

  it('corrects the two most visibly misplaced door openings without overstating their source evidence', () => {
    const bedroomDoor = TIFERET_5_1.walls.find((wall) => wall.id === 'bed-s')?.openings[0];
    const bathroomDoor = TIFERET_5_1.walls.find((wall) => wall.id === 'bath-n')?.openings[0];

    expect(bedroomDoor?.offset).toBeGreaterThan(1_700);
    expect(bedroomDoor?.width).toBeGreaterThanOrEqual(700);
    expect(bedroomDoor?.width).toBeLessThanOrEqual(850);
    expect(bathroomDoor?.offset).toBeGreaterThanOrEqual(700);
    expect(bathroomDoor?.offset).toBeLessThanOrEqual(850);
    expect(bathroomDoor?.measurements?.offset?.origin).toBe('derived');
  });

  it('maps balcony glazing as one continuous opening per source bay', () => {
    const bedroomOpenings = TIFERET_5_1.walls.find((wall) => wall.id === 'bed-n')?.openings ?? [];
    const livingOpenings = TIFERET_5_1.walls.find((wall) => wall.id === 'living-n')?.openings ?? [];

    expect(bedroomOpenings).toHaveLength(1);
    expect(bedroomOpenings[0]).toMatchObject({ kind: 'window', offset: 817, width: 1_181 });
    expect(livingOpenings).toHaveLength(1);
    expect(livingOpenings[0]).toMatchObject({ kind: 'door', offset: 656, width: 2_361, swing: 'sliding' });
  });

  it('attaches wet-room doors to the horizontal doorway gaps shown in the source', () => {
    const showerEast = TIFERET_5_1.walls.find((wall) => wall.id === 'shower-e');
    const showerSouth = TIFERET_5_1.walls.find((wall) => wall.id === 'shower-s');
    const guestEast = TIFERET_5_1.walls.find((wall) => wall.id === 'guest-wc-e');
    const guestSouth = TIFERET_5_1.walls.find((wall) => wall.id === 'guest-wc-s');

    expect(showerEast?.openings).toHaveLength(0);
    expect(showerSouth?.openings[0]).toMatchObject({ id: 'shower-door', offset: 92, width: 791 });
    expect(guestEast?.openings).toHaveLength(0);
    expect(guestSouth?.openings[0]).toMatchObject({ id: 'guest-wc-door', offset: 90, width: 697 });
  });

  it('models the laundry hideaway and the 155 by 105 cm service shaft as separate source-traced areas', () => {
    expect(roomBounds('laundry')).toEqual({ left: 2_764, right: 5_370, top: 8_402, bottom: 10_150 });

    const laundryWindow = TIFERET_5_1.walls.find((wall) => wall.id === 'laundry-e')?.openings[0];
    const kitchenWindow = TIFERET_5_1.walls.find((wall) => wall.id === 'kitchen-w')?.openings[0];
    expect(laundryWindow).toMatchObject({ kind: 'window', offset: 469, width: 1_201 });
    expect(kitchenWindow).toMatchObject({ kind: 'window', offset: 78, width: 1_201 });

    const shaft = TIFERET_5_1.fixedElements.find((element) => element.id === 'bath-service-shaft');
    const xs = shaft?.polygon.map((point) => point.x) ?? [];
    const ys = shaft?.polygon.map((point) => point.y) ?? [];
    expect({ left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }).toEqual({
      left: 3_977,
      right: 5_524,
      top: 6_936,
      bottom: 8_029,
    });
    expect(shaft?.kind).toBe('shaft');
  });

  it('rejects invalid dimensions attached to a fixed architectural element', () => {
    const invalidApartment = {
      ...TIFERET_5_1,
      fixedElements: TIFERET_5_1.fixedElements.map((element) =>
        element.id === 'bath-service-shaft'
          ? {
              ...element,
              dimensions: [
                {
                  id: 'invalid-shaft-width',
                  label: 'רוחב',
                  value: -1,
                  axis: 'horizontal' as const,
                  evidence: { origin: 'explicit' as const, basis: 'clear' as const, confidence: 'high' as const },
                },
              ],
            }
          : element,
      ),
    };

    expect(validateApartment(invalidApartment)).toBe(false);
  });

  it('keeps traced opening evidence auditable and marks untraced offsets as derived', () => {
    const openings = TIFERET_5_1.walls.flatMap((wall) => wall.openings);
    const traced = openings.filter((opening) => opening.measurements?.width?.origin === 'vector-traced');
    const inferred = openings.filter((opening) => opening.measurements?.width?.origin === 'derived');

    expect(traced.length).toBeGreaterThan(0);
    expect(traced.every((opening) => opening.trace?.sourceRect !== undefined)).toBe(true);
    expect(inferred.map((opening) => opening.id)).toEqual(
      expect.arrayContaining([
        'safe-door',
        'safe-window',
        'bed-door',
        'shower-window',
        'master-door',
        'master-window',
        'bath-door',
      ]),
    );
  });

  it('pins sanitary fixtures to the source-plan side of each wet room', () => {
    const fixtures = (TIFERET_5_1 as typeof TIFERET_5_1 & { fixtures?: AuditedFixture[] }).fixtures ?? [];
    const bathtub = fixtures.find((fixture) => fixture.id === 'bath-bathtub');
    const showerTray = fixtures.find((fixture) => fixture.id === 'shower-tray');
    const showerVanity = fixtures.find((fixture) => fixture.id === 'shower-vanity');

    expect(fixtures.filter((fixture) => fixture.roomId === 'bath').map((fixture) => fixture.kind)).toEqual(
      expect.arrayContaining(['bathtub', 'toilet', 'vanity']),
    );
    expect(Math.min(...(bathtub?.polygon.map((point) => point.x) ?? []))).toBeGreaterThan(5_400);
    expect(Math.max(...(showerTray?.polygon.map((point) => point.x) ?? []))).toBeLessThan(1_100);
    expect(Math.min(...(showerVanity?.polygon.map((point) => point.x) ?? []))).toBeGreaterThan(1_000);
    expect(fixtures.every((fixture) => fixture.trace?.confidence !== 'unresolved')).toBe(true);
  });

  it('rejects a source fixture that points outside the room graph or has no polygon', () => {
    const invalidApartment = {
      ...TIFERET_5_1,
      fixtures: [
        {
          id: 'invalid-source-fixture',
          roomId: 'missing-room',
          kind: 'bathtub' as const,
          label: 'אמבט לא תקין',
          polygon: [],
          trace: { sourceFileId: 'source', sourcePage: 1, confidence: 'high' as const },
        },
      ],
    };

    expect(validateApartment(invalidApartment)).toBe(false);
  });

  it('rejects a source fixture with an unsupported kind', () => {
    const invalidApartment = {
      ...TIFERET_5_1,
      fixtures: [
        {
          id: 'invalid-source-fixture-kind',
          roomId: 'bath',
          kind: 'jacuzzi',
          label: 'סוג קבועה לא מוכר',
          polygon: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
          trace: { sourceFileId: 'source', sourcePage: 1, confidence: 'high' as const },
        },
      ],
    } as unknown as typeof TIFERET_5_1;

    expect(validateApartment(invalidApartment)).toBe(false);
  });

  it('rejects a source fixture without trace metadata without throwing', () => {
    const fixtureWithoutTrace = {
      ...TIFERET_5_1,
      fixtures: [
        {
          id: 'fixture-without-trace',
          roomId: 'bath',
          kind: 'bathtub',
          label: 'אמבט ללא מקור',
          polygon: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    } as unknown as typeof TIFERET_5_1;

    expect(() => validateApartment(fixtureWithoutTrace)).not.toThrow();
    expect(validateApartment(fixtureWithoutTrace)).toBe(false);
  });
});
