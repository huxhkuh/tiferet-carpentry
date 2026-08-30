import { describe, expect, it } from 'vitest';

import * as furnitureCatalog from '../../src/apartment/furniture/catalog';
import { rectangleFootprintsOverlap, validateFurnitureMove } from '../../src/apartment/geometry/scene-collision';
import { furnitureFootprint } from '../../src/apartment/furniture/geometry';
import type { FurnitureKind, FurniturePlacement, Room } from '../../src/apartment/types';

interface PlacementRequest {
  id: string;
  room: Room;
  kind: FurnitureKind;
  existingFurniture: readonly FurniturePlacement[];
  template?: FurniturePlacement;
}

type PlaceFurnitureInRoom = (request: PlacementRequest) => FurniturePlacement;

const LARGE_ROOM: Room = {
  id: 'room-large',
  name: 'חדר גדול',
  wallIds: [],
  polygon: [
    { x: 0, y: 0 },
    { x: 5_000, y: 0 },
    { x: 5_000, y: 5_000 },
    { x: 0, y: 5_000 },
  ],
};

function placementFactory(): PlaceFurnitureInRoom {
  return Reflect.get(furnitureCatalog, 'placeFurnitureInRoom') as PlaceFurnitureInRoom;
}

describe('free furniture placement', () => {
  it('places a catalogue item completely inside the selected room', () => {
    const placeFurnitureInRoom = placementFactory();

    const placed = placeFurnitureInRoom({
      id: 'added-sofa',
      room: LARGE_ROOM,
      kind: 'sofa',
      existingFurniture: [],
    });

    expect(placed).toMatchObject({ id: 'added-sofa', roomId: LARGE_ROOM.id, kind: 'sofa' });
    expect(validateFurnitureMove(LARGE_ROOM, placed, [])).toBeNull();
  });

  it('finds a different free position when the room centre is occupied', () => {
    const placeFurnitureInRoom = placementFactory();
    const first = placeFurnitureInRoom({
      id: 'first-sofa',
      room: LARGE_ROOM,
      kind: 'sofa',
      existingFurniture: [],
    });

    const second = placeFurnitureInRoom({
      id: 'second-sofa',
      room: LARGE_ROOM,
      kind: 'sofa',
      existingFurniture: [first],
    });

    expect(rectangleFootprintsOverlap(furnitureFootprint(first), furnitureFootprint(second))).toBe(false);
  });

  it('reports that an item cannot fit instead of placing it outside the room', () => {
    const placeFurnitureInRoom = placementFactory();
    const tinyRoom: Room = {
      ...LARGE_ROOM,
      id: 'room-tiny',
      polygon: [
        { x: 0, y: 0 },
        { x: 500, y: 0 },
        { x: 500, y: 500 },
        { x: 0, y: 500 },
      ],
    };

    expect(() =>
      placeFurnitureInRoom({ id: 'large-bed', room: tinyRoom, kind: 'double-bed', existingFurniture: [] }),
    ).toThrow(/אין בחדר מקום פנוי/);
  });

  it('preserves customized dimensions and colours when duplicating an item', () => {
    const placeFurnitureInRoom = placementFactory();
    const template: FurniturePlacement = {
      ...furnitureCatalog.createFurniturePlacement('template', LARGE_ROOM.id, 'sofa', 2_500, 2_500),
      width: 2_200,
      color: '#123456',
      accentColor: '#654321',
    };

    const duplicate = placeFurnitureInRoom({
      id: 'duplicate',
      room: LARGE_ROOM,
      kind: template.kind,
      existingFurniture: [template],
      template,
    });

    expect(duplicate).toMatchObject({
      id: 'duplicate',
      width: 2_200,
      depth: template.depth,
      height: template.height,
      color: '#123456',
      accentColor: '#654321',
    });
  });
});
