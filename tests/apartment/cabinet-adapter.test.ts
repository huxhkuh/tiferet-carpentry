import { describe, expect, it } from 'vitest';
import {
  createCabinetPlacement,
  createWardrobeConfig,
  deriveCabinet,
  derivePlacedCabinet,
  updateCabinetPlacement,
} from '../../src/apartment/cabinet/adapter';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import type { FurniturePlacement } from '../../src/apartment/types';

const bedroom = TIFERET_5_1.rooms.find((room) => room.id === 'bedroom')!;
const eastWall = TIFERET_5_1.walls.find((wall) => wall.id === 'bed-e')!;
const southWall = TIFERET_5_1.walls.find((wall) => wall.id === 'bed-s')!;

describe('WoodworkingShop cabinet adapter', () => {
  it('derives dimensions, parts and validation through the existing cabinet engine', () => {
    const config = createWardrobeConfig({ width: 1800, height: 2400, depth: 600, shelfCount: 5 });
    const result = deriveCabinet(config);

    expect(result.config).toBe(config);
    expect(result.dimensions.internalWidth).toBeLessThan(config.width);
    expect(result.parts.length).toBeGreaterThan(5);
    expect(result.parts.some((part) => part.name.en === 'Hanging Rail')).toBe(true);
    expect(result.hasErrors).toBe(false);
  });

  it('automatically places a wardrobe in the first usable architectural interval', () => {
    const placement = createCabinetPlacement({
      apartment: TIFERET_5_1,
      room: bedroom,
      wall: southWall,
      cabinetConfig: { width: 1000 },
      furniture: [],
      id: 'auto-fit',
    });

    expect(placement.distanceFromWallStart).toBe(0);
  });

  it('skips furniture that occupies the first visually usable cabinet position', () => {
    const movedBed: FurniturePlacement = {
      id: 'bed-near-east-wall',
      roomId: bedroom.id,
      kind: 'single-bed',
      label: 'מיטת יחיד',
      x: 5_600,
      y: 450,
      width: 800,
      depth: 900,
      height: 900,
      elevation: 0,
      rotation: 0,
    };

    const placement = createCabinetPlacement({
      apartment: TIFERET_5_1,
      room: bedroom,
      wall: eastWall,
      cabinetConfig: { width: 900, depth: 600 },
      furniture: [movedBed],
      id: 'furniture-aware-fit',
    });

    expect(placement.distanceFromWallStart).toBeGreaterThan(0);
  });

  it('creates the planner default 1800 × 2400 × 600 wardrobe without blocking on advisory engine issues', () => {
    expect(() =>
      createCabinetPlacement({
        apartment: TIFERET_5_1,
        room: bedroom,
        wall: eastWall,
        cabinetConfig: {
          width: 1800,
          height: 2400,
          depth: 600,
          shelfCount: 5,
          carcassMaterial: 'melamine-18',
        },
        id: 'planner-default',
      }),
    ).not.toThrow();
  });

  it('ignores placements from a different apartment when checking collisions', () => {
    const otherApartmentPlacement = {
      ...createCabinetPlacement({
        apartment: TIFERET_5_1,
        room: bedroom,
        wall: eastWall,
        cabinetConfig: { width: 1000 },
        id: 'other-apartment-placement',
      }),
      apartmentId: 'another-apartment',
    };

    expect(() =>
      createCabinetPlacement({
        apartment: TIFERET_5_1,
        room: bedroom,
        wall: eastWall,
        cabinetConfig: { width: 900 },
        distanceFromWallStart: 0,
        existingPlacements: [otherApartmentPlacement],
        id: 'current-apartment-placement',
      }),
    ).not.toThrow();
  });

  it('rejects room and wall relationships outside the selected apartment context', () => {
    expect(() =>
      createCabinetPlacement({
        apartment: TIFERET_5_1,
        room: { ...bedroom, id: 'room-outside-apartment' },
        wall: eastWall,
        id: 'wrong-room',
      }),
    ).toThrow(/החדר אינו שייך/);
    expect(() =>
      createCabinetPlacement({
        apartment: TIFERET_5_1,
        room: bedroom,
        wall: TIFERET_5_1.walls.find((wall) => wall.id === 'kitchen-n')!,
        id: 'wrong-wall',
      }),
    ).toThrow(/הקיר אינו שייך/);
  });

  it('updates all dimensional fields immutably and derives the matching footprint', () => {
    const placement = createCabinetPlacement({
      apartment: TIFERET_5_1,
      room: bedroom,
      wall: eastWall,
      cabinetConfig: { width: 900 },
      id: 'editable',
    });
    const updated = updateCabinetPlacement(placement, { width: 1200, height: 2400 }, eastWall, bedroom, [placement]);
    const derived = derivePlacedCabinet(updated, eastWall, bedroom);

    expect(updated).not.toBe(placement);
    expect(updated.cabinetConfig).not.toBe(placement.cabinetConfig);
    expect(placement.width).toBe(900);
    expect(updated).toMatchObject({ width: 1200, height: 2400 });
    expect(derived.footprint).toHaveLength(4);
    expect(derived.config.width).toBe(1200);
  });

  it('ignores cabinets from other apartments while updating a placement', () => {
    const placement = createCabinetPlacement({
      apartment: TIFERET_5_1,
      room: bedroom,
      wall: eastWall,
      cabinetConfig: { width: 900 },
      id: 'editable-current-apartment',
    });
    const placementFromAnotherApartment = {
      ...placement,
      id: 'editable-other-apartment',
      apartmentId: 'another-apartment',
    };

    expect(() =>
      updateCabinetPlacement(placement, { width: 1200 }, eastWall, bedroom, [placementFromAnotherApartment]),
    ).not.toThrow();
  });

  it('rejects cabinet configurations that the existing engine marks as errors', () => {
    expect(() =>
      createCabinetPlacement({
        apartment: TIFERET_5_1,
        room: bedroom,
        wall: eastWall,
        cabinetConfig: { width: 100 },
        id: 'invalid-engine-config',
      }),
    ).toThrow(/רוחב הארון/);
  });
});
