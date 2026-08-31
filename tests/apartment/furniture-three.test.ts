import { describe, expect, it } from 'vitest';

import { createFurniturePlacement } from '../../src/apartment/furniture/catalog';
import { buildFurniturePrimitives } from '../../src/apartment/three/furniture';
import { buildApartmentRoomScene, ROOM_MATERIAL_IDS } from '../../src/apartment/three/scene';
import type { Apartment, Room } from '../../src/apartment/types';

describe('furniture 3D models', () => {
  it('adds upholstered detail to a soft dining chair without mutating its dimensions', () => {
    const chair = createFurniturePlacement('chair', 'living', 'dining-chair', 0, 0, { style: 'soft' });
    const dimensions = { width: chair.width, depth: chair.depth, height: chair.height };

    const soft = buildFurniturePrimitives(chair, 'warm');
    const minimal = buildFurniturePrimitives({ ...chair, style: 'minimal' }, 'warm');

    expect(soft.length).toBeGreaterThan(minimal.length);
    expect(chair).toMatchObject(dimensions);
  });

  it('adds a visible stretcher detail to a classic dining table', () => {
    const table = createFurniturePlacement('table', 'living', 'dining-table', 0, 0, { style: 'classic' });

    const classic = buildFurniturePrimitives(table, 'warm');
    const minimal = buildFurniturePrimitives({ ...table, style: 'minimal' }, 'warm');

    expect(classic.length).toBeGreaterThan(minimal.length);
  });

  it('uses the selected material in the rendered room scene', () => {
    const room: Room = {
      id: 'room',
      name: 'חדר',
      wallIds: [],
      polygon: [
        { x: 0, y: 0 },
        { x: 3_000, y: 0 },
        { x: 3_000, y: 3_000 },
        { x: 0, y: 3_000 },
      ],
    };
    const table = createFurniturePlacement('table', room.id, 'coffee-table', 1_500, 1_500, {
      material: 'glass',
    });
    const apartment: Apartment = {
      id: 'apartment',
      name: 'דירה',
      type: 'test',
      rooms: [room],
      walls: [],
      fixedElements: [],
      furniture: [table],
      source: {
        project: 'Tiferet',
        building: 'Techelet',
        floor: 5,
        sheet: 'test',
        sourceType: 'sales-plan-pdf',
        modelingMethod: 'manually-normalized',
      },
    };

    const scene = buildApartmentRoomScene(apartment, room, []);
    const materialIds = Array.from(
      { length: scene.vertices.length / scene.vertexStride },
      (_, index) => scene.vertices[index * scene.vertexStride + 9],
    );

    expect(materialIds).toContain(ROOM_MATERIAL_IDS.glass);
  });
});
