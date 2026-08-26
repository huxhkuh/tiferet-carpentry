import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createWardrobeConfig } from '../../src/apartment/cabinet/adapter';
import { Plan2D } from '../../src/apartment/components/Plan2D';
import type { Apartment, CabinetPlacement } from '../../src/apartment/types';

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
      <Plan2D
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
      <Plan2D
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
    expect(screen.getByRole('group', { name: 'תכנית דירה 5-1' })).toHaveAttribute('viewBox', '-260 -260 920 820');
    expect(screen.queryByTestId('room-plan-room-other')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wall-select-wall-other')).not.toBeInTheDocument();
    expect(screen.queryByText('עמוד בחדר אחר')).not.toBeInTheDocument();
    expect(screen.queryByText('חדר בדיקה')).not.toBeInTheDocument();
  });
});
