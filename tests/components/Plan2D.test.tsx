import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createWardrobeConfig } from '../../src/apartment/cabinet/adapter';
import { Plan2D } from '../../src/apartment/components/Plan2D';
import type { Apartment, CabinetPlacement, FurniturePlacement } from '../../src/apartment/types';

const LayeredPlan2D = Plan2D as ComponentType<
  ComponentProps<typeof Plan2D> & { showDimensions?: boolean; showLabels?: boolean }
>;

const apartment: Apartment = {
  id: 'apartment-test',
  name: 'דירת בדיקה',
  type: 'בדיקה',
  source: {
    project: 'Tiferet',
    building: 'Techelet',
    floor: 5,
    sheet: 'test',
    sourceType: 'sales-plan-pdf',
    modelingMethod: 'manually-normalized',
  },
  rooms: [
    {
      id: 'room-test',
      name: 'חדר בדיקה',
      polygon: [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
        { x: 400, y: 300 },
        { x: 0, y: 300 },
      ],
      wallIds: ['wall-top'],
    },
    {
      id: 'room-other',
      name: 'חדר אחר',
      polygon: [
        { x: 600, y: 0 },
        { x: 900, y: 0 },
        { x: 900, y: 300 },
        { x: 600, y: 300 },
      ],
      wallIds: ['wall-other'],
    },
  ],
  walls: [
    {
      id: 'wall-top',
      start: { x: 0, y: 0 },
      end: { x: 400, y: 0 },
      openings: [],
    },
    {
      id: 'wall-other',
      start: { x: 600, y: 0 },
      end: { x: 900, y: 0 },
      openings: [],
    },
  ],
  fixedElements: [
    {
      id: 'other-obstacle',
      roomId: 'room-other',
      kind: 'column',
      label: 'עמוד בחדר אחר',
      polygon: [
        { x: 620, y: 20 },
        { x: 680, y: 20 },
        { x: 680, y: 80 },
        { x: 620, y: 80 },
      ],
    },
  ],
};

const config = createWardrobeConfig({ width: 100, height: 200, depth: 50, shelfCount: 0 });
const placement: CabinetPlacement = {
  id: 'cabinet-test',
  apartmentId: apartment.id,
  roomId: 'room-test',
  wallId: 'wall-top',
  distanceFromWallStart: 20,
  elevation: 0,
  orientation: Math.PI / 2,
  width: config.width,
  height: config.height,
  depth: config.depth,
  cabinetConfig: config,
};

const bed: FurniturePlacement = {
  id: 'bed-test',
  roomId: 'room-test',
  kind: 'single-bed',
  label: 'מיטת יחיד',
  x: 210,
  y: 150,
  width: 80,
  depth: 140,
  height: 90,
  elevation: 0,
  rotation: 0,
};

describe('Plan2D', () => {
  it('renders source-vector wall masses instead of generic centre-line walls', () => {
    const vectorApartment: Apartment = {
      ...apartment,
      wallMasses: [
        {
          id: 'source-wall-mass',
          polygon: [
            { x: -40, y: -40 },
            { x: 440, y: -40 },
            { x: 440, y: 0 },
            { x: -40, y: 0 },
          ],
        },
      ],
    };

    render(
      <LayeredPlan2D
        apartment={vectorApartment}
        placements={[]}
        roomId={null}
        wallId={null}
        activePlacementId={null}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.getByTestId('wall-mass-source-wall-mass')).toHaveAttribute('points', '-40,-40 440,-40 440,0 -40,0');
    expect(screen.getByTestId('semantic-wall-wall-top')).toHaveAttribute('stroke', 'transparent');
  });

  it('shows the metric room dimensions held by the semantic model', () => {
    render(
      <LayeredPlan2D
        apartment={apartment}
        placements={[]}
        roomId={null}
        wallId={null}
        activePlacementId={null}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.getByTestId('room-dimensions-room-test')).toHaveTextContent('40 × 30 ס״מ');
  });

  it('prefers explicit source dimensions and can hide dimensions and room labels independently', () => {
    const auditedApartment = {
      ...apartment,
      rooms: apartment.rooms.map((room) =>
        room.id === 'room-test'
          ? {
              ...room,
              dimensions: [
                {
                  id: 'room-test-width',
                  label: 'רוחב נקי',
                  value: 2_950,
                  evidence: { origin: 'explicit', basis: 'clear', confidence: 'high' },
                },
                {
                  id: 'room-test-depth',
                  label: 'עומק נקי',
                  value: 3_050,
                  evidence: { origin: 'explicit', basis: 'clear', confidence: 'high' },
                },
              ],
            }
          : room,
      ),
    } as Apartment;

    const { rerender } = render(
      <LayeredPlan2D
        apartment={auditedApartment}
        placements={[]}
        roomId={null}
        wallId={null}
        activePlacementId={null}
        showDimensions
        showLabels
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.getByTestId('room-dimensions-room-test')).toHaveTextContent('295 × 305 ס״מ');
    expect(screen.getByText('חדר בדיקה')).toBeVisible();

    rerender(
      <LayeredPlan2D
        apartment={auditedApartment}
        placements={[]}
        roomId={null}
        wallId={null}
        activePlacementId={null}
        showDimensions={false}
        showLabels={false}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('room-dimensions-room-test')).not.toBeInTheDocument();
    expect(screen.queryByText('חדר בדיקה')).not.toBeInTheDocument();
  });

  it('renders source-traced fixtures as fixed architecture rather than draggable furniture', () => {
    const fixture = {
      id: 'fixture-bathtub',
      roomId: 'room-test',
      kind: 'bathtub',
      label: 'אמבט',
      polygon: [
        { x: 280, y: 20 },
        { x: 380, y: 20 },
        { x: 380, y: 270 },
        { x: 280, y: 270 },
      ],
      trace: { sourceFileId: 'source', sourcePage: 1, confidence: 'high' },
    };
    const auditedApartment = { ...apartment, fixtures: [fixture] } as Apartment;

    render(
      <Plan2D
        apartment={auditedApartment}
        placements={[]}
        roomId="room-test"
        wallId={null}
        activePlacementId={null}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.getByTestId('architectural-fixture-fixture-bathtub')).toHaveAttribute('aria-label', 'אמבט');
    expect(screen.queryByRole('button', { name: 'בחירת ריהוט אמבט' })).not.toBeInTheDocument();
  });

  it('lets keyboard users select rooms and walls', () => {
    const onRoom = vi.fn();
    const onWall = vi.fn();
    render(
      <Plan2D
        apartment={apartment}
        placements={[]}
        roomId={null}
        wallId={null}
        activePlacementId={null}
        onRoom={onRoom}
        onWall={onWall}
        onPlacement={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByTestId('room-plan-room-test'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('wall-select-wall-top'), { key: ' ' });

    expect(onRoom).toHaveBeenCalledWith('room-test');
    expect(onWall).toHaveBeenCalledWith('wall-top');
  });

  it('draws the cabinet footprint along the wall and into the selected room', () => {
    render(
      <Plan2D
        apartment={apartment}
        placements={[placement]}
        roomId="room-test"
        wallId="wall-top"
        activePlacementId="cabinet-test"
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.getByTestId('cabinet-footprint-cabinet-test')).toHaveAttribute('points', '20,0 120,0 120,50 20,50');
    expect(screen.getByRole('group', { name: 'תכנית דירת בדיקה' })).toHaveAttribute('viewBox', '-260 -260 920 820');
    expect(screen.queryByTestId('room-plan-room-other')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wall-select-wall-other')).not.toBeInTheDocument();
    expect(screen.queryByText('עמוד בחדר אחר')).not.toBeInTheDocument();
    expect(screen.queryByText('חדר בדיקה')).not.toBeInTheDocument();
  });

  it('expands a focused-room view to include fixed architecture assigned to that room', () => {
    const focusedApartment: Apartment = {
      ...apartment,
      fixedElements: [
        ...apartment.fixedElements,
        {
          id: 'room-test-shaft',
          roomId: 'room-test',
          kind: 'shaft',
          label: 'פיר שירות',
          polygon: [
            { x: 800, y: 50 },
            { x: 900, y: 50 },
            { x: 900, y: 100 },
            { x: 800, y: 100 },
          ],
        },
      ],
    };

    render(
      <Plan2D
        apartment={focusedApartment}
        placements={[]}
        roomId="room-test"
        wallId={null}
        activePlacementId={null}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: 'תכנית דירת בדיקה' })).toHaveAttribute('viewBox', '-260 -260 1420 820');
    expect(screen.getByText('פיר שירות')).toBeInTheDocument();
  });

  it('lets users select furniture as an editable object and highlights the active item', () => {
    const onFurniture = vi.fn();
    render(
      <Plan2D
        apartment={apartment}
        placements={[]}
        furniture={[bed]}
        visibility={{ hiddenObjectIds: [], hiddenCategories: [] }}
        roomId="room-test"
        wallId={null}
        activePlacementId={null}
        activeFurnitureId={bed.id}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
        onFurniture={onFurniture}
      />,
    );

    const editableBed = screen.getByRole('button', { name: 'בחירת ריהוט מיטת יחיד' });
    expect(editableBed).toHaveAttribute('data-selected', 'true');
    fireEvent.click(editableBed);
    expect(onFurniture).toHaveBeenCalledWith(bed.id);
  });

  it('omits furniture hidden individually or by its visibility layer', () => {
    const { rerender } = render(
      <Plan2D
        apartment={apartment}
        placements={[]}
        furniture={[bed]}
        visibility={{ hiddenObjectIds: [bed.id], hiddenCategories: [] }}
        roomId="room-test"
        wallId={null}
        activePlacementId={null}
        activeFurnitureId={null}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
        onFurniture={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(`furniture-${bed.id}`)).not.toBeInTheDocument();

    rerender(
      <Plan2D
        apartment={apartment}
        placements={[]}
        furniture={[bed]}
        visibility={{ hiddenObjectIds: [], hiddenCategories: ['beds'] }}
        roomId="room-test"
        wallId={null}
        activePlacementId={null}
        activeFurnitureId={null}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
        onFurniture={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(`furniture-${bed.id}`)).not.toBeInTheDocument();
  });

  it('drags selected furniture directly in plan coordinates', () => {
    const onFurnitureMove = vi.fn();
    render(
      <Plan2D
        apartment={apartment}
        placements={[]}
        furniture={[bed]}
        visibility={{ hiddenObjectIds: [], hiddenCategories: [] }}
        roomId="room-test"
        wallId={null}
        activePlacementId={null}
        activeFurnitureId={bed.id}
        onRoom={vi.fn()}
        onWall={vi.fn()}
        onPlacement={vi.fn()}
        onFurniture={vi.fn()}
        onFurnitureMove={onFurnitureMove}
      />,
    );
    const plan = screen.getByRole('group', { name: 'תכנית דירת בדיקה' });
    vi.spyOn(plan, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 920,
      bottom: 820,
      width: 920,
      height: 820,
      toJSON: () => ({}),
    });
    const editableBed = screen.getByTestId(`furniture-${bed.id}`);

    fireEvent.pointerDown(editableBed, { pointerId: 1, clientX: 470, clientY: 410 });
    fireEvent.pointerMove(editableBed, { pointerId: 1, clientX: 570, clientY: 460 });
    fireEvent.pointerUp(editableBed, { pointerId: 1 });

    expect(onFurnitureMove).toHaveBeenLastCalledWith(bed.id, 310, 200);
  });
});
