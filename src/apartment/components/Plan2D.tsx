import type { KeyboardEvent } from 'react';
import type { Apartment, CabinetPlacement, FurniturePalette, Room } from '../types';
import { cabinetFootprint, wallAngle } from '../geometry/placement';
import { furnitureFootprint } from '../furniture/geometry';
import { getFurnitureAppearance } from '../furniture/catalog';

interface Props {
  apartment: Apartment;
  placements: CabinetPlacement[];
  roomId: string | null;
  wallId: string | null;
  activePlacementId: string | null;
  showFurniture?: boolean;
  furniturePalette?: FurniturePalette;
  onRoom(id: string): void;
  onWall(id: string): void;
  onPlacement(id: string): void;
}

function activateFromKeyboard(event: KeyboardEvent<SVGGElement>, activate: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  activate();
}

function roomMetrics(room: Room) {
  const xs = room.polygon.map((point) => point.x);
  const ys = room.polygon.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    width: right - left,
    height: bottom - top,
  };
}

export function Plan2D({
  apartment,
  placements,
  roomId,
  wallId,
  activePlacementId,
  showFurniture = true,
  furniturePalette = 'warm',
  onRoom,
  onWall,
  onPlacement,
}: Props) {
  const allPoints = [
    ...apartment.rooms.flatMap((room) => room.polygon),
    ...apartment.walls.flatMap((wall) => [wall.start, wall.end]),
    ...(apartment.wallMasses ?? []).flatMap((mass) => mass.polygon),
    ...apartment.fixedElements.flatMap((element) => element.polygon),
    ...(apartment.furniture ?? []).flatMap(furnitureFootprint),
  ];
  const selectedRoom = apartment.rooms.find((room) => room.id === roomId);
  const visibleRooms = selectedRoom ? [selectedRoom] : apartment.rooms;
  const focusedWalls = selectedRoom
    ? apartment.walls.filter((wall) => selectedRoom.wallIds.includes(wall.id))
    : apartment.walls;
  const visibleFixedElements = selectedRoom
    ? apartment.fixedElements.filter((element) => element.roomId === selectedRoom.id)
    : apartment.fixedElements;
  const visiblePlacements = selectedRoom
    ? placements.filter((placement) => placement.roomId === selectedRoom.id)
    : placements;
  const visibleFurniture = showFurniture
    ? (apartment.furniture ?? []).filter((item) => !selectedRoom || item.roomId === selectedRoom.id)
    : [];
  const usesSourceWallMasses = (apartment.wallMasses?.length ?? 0) > 0;
  const visiblePoints = selectedRoom
    ? [...selectedRoom.polygon, ...focusedWalls.flatMap((wall) => [wall.start, wall.end])]
    : allPoints;
  const padding = selectedRoom ? 260 : 300;
  const minX = Math.min(...visiblePoints.map((point) => point.x)) - padding;
  const minY = Math.min(...visiblePoints.map((point) => point.y)) - padding;
  const maxX = Math.max(...visiblePoints.map((point) => point.x)) + padding;
  const maxY = Math.max(...visiblePoints.map((point) => point.y)) + padding;
  const viewWidth = maxX - minX;
  const viewHeight = maxY - minY;
  return (
    <svg
      className="h-full min-h-96 w-full"
      viewBox={`${minX} ${minY} ${viewWidth} ${viewHeight}`}
      role="group"
      aria-label="תכנית דירה 5-1"
    >
      <rect x={minX} y={minY} width={viewWidth} height={viewHeight} fill="#f7f4ed" rx="80" />
      {visibleRooms.map((room) => {
        const metrics = roomMetrics(room);
        return (
          <g
            key={room.id}
            onClick={() => onRoom(room.id)}
            onKeyDown={(event) => activateFromKeyboard(event, () => onRoom(room.id))}
            className="cursor-pointer"
            data-testid={`room-plan-${room.id}`}
            role="button"
            tabIndex={0}
            aria-label={`בחירת חדר ${room.name}`}
          >
            <polygon
              points={room.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={room.id === roomId ? '#e8dcc6' : '#fffdf8'}
              stroke="transparent"
            />
            {room.id !== roomId ? (
              <>
                <text
                  x={metrics.centerX}
                  y={metrics.centerY - 70}
                  textAnchor="middle"
                  className="fill-stone-700 text-[180px] font-bold"
                >
                  {room.name}
                </text>
                <text
                  data-testid={`room-dimensions-${room.id}`}
                  x={metrics.centerX}
                  y={metrics.centerY + 105}
                  textAnchor="middle"
                  className="fill-stone-500 text-[105px] font-semibold"
                >
                  {Math.round(metrics.width / 10)} × {Math.round(metrics.height / 10)} ס״מ
                </text>
              </>
            ) : null}
          </g>
        );
      })}
      {(apartment.wallMasses ?? []).map((mass) => (
        <polygon
          key={mass.id}
          data-testid={`wall-mass-${mass.id}`}
          points={mass.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="#494641"
          className="pointer-events-none"
        />
      ))}
      {visibleFixedElements.map((element) => (
        <g key={element.id}>
          <polygon
            points={element.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="#d7c7ae"
            stroke="#9b8265"
            strokeWidth="26"
            strokeDasharray="70 44"
          />
          <text
            x={element.polygon.reduce((sum, p) => sum + p.x, 0) / element.polygon.length}
            y={element.polygon.reduce((sum, p) => sum + p.y, 0) / element.polygon.length}
            textAnchor="middle"
            className="fill-stone-600 text-[95px] font-semibold"
          >
            {element.label}
          </text>
        </g>
      ))}
      {visibleFurniture.map((item) => {
        const appearance = getFurnitureAppearance(item, furniturePalette);
        const footprint = furnitureFootprint(item);
        const isRug = item.kind === 'rug';
        return (
          <g
            key={item.id}
            data-testid={`furniture-${item.id}`}
            role="img"
            aria-label={item.label}
            className="pointer-events-none"
          >
            <polygon
              points={footprint.map((point) => `${point.x},${point.y}`).join(' ')}
              fill={isRug ? appearance.soft : appearance.primary}
              fillOpacity={isRug ? 0.72 : 0.9}
              stroke={appearance.accent}
              strokeWidth={isRug ? 22 : 28}
              strokeDasharray={isRug ? '50 28' : undefined}
            />
            {item.kind.includes('bed') ? (
              <line
                x1={footprint[0].x}
                y1={footprint[0].y}
                x2={footprint[1].x}
                y2={footprint[1].y}
                stroke={appearance.soft}
                strokeWidth="120"
              />
            ) : null}
            {selectedRoom ? (
              <text
                x={item.x}
                y={item.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-stone-800 text-[72px] font-semibold"
              >
                {item.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {focusedWalls.map((wall) => (
        <g
          key={wall.id}
          onClick={() => onWall(wall.id)}
          onKeyDown={(event) => activateFromKeyboard(event, () => onWall(wall.id))}
          className="cursor-pointer"
          data-testid={`wall-select-${wall.id}`}
          role="button"
          tabIndex={0}
          aria-label={`בחירת קיר באורך ${Math.round(Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) / 10)} ס״מ`}
        >
          <line
            data-testid={`semantic-wall-${wall.id}`}
            x1={wall.start.x}
            y1={wall.start.y}
            x2={wall.end.x}
            y2={wall.end.y}
            stroke={wall.id === wallId ? '#b66b3d' : usesSourceWallMasses ? 'transparent' : '#34312e'}
            strokeWidth={wall.id === wallId ? 100 : usesSourceWallMasses ? 180 : 55}
            strokeLinecap={usesSourceWallMasses ? 'butt' : 'round'}
          />
          {wall.openings.map((opening) => {
            const a = wallAngle(wall);
            const x1 = wall.start.x + Math.cos(a) * opening.offset;
            const y1 = wall.start.y + Math.sin(a) * opening.offset;
            const x2 = x1 + Math.cos(a) * opening.width;
            const y2 = y1 + Math.sin(a) * opening.width;
            return (
              <line
                key={opening.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={opening.kind === 'door' ? '#c39a72' : '#72a5b6'}
                strokeWidth="115"
              />
            );
          })}
        </g>
      ))}
      {visiblePlacements.map((placement) => {
        const wall = apartment.walls.find((item) => item.id === placement.wallId);
        if (!wall) return null;
        const room = apartment.rooms.find((item) => item.id === placement.roomId);
        const footprint = cabinetFootprint(
          wall,
          placement.distanceFromWallStart,
          placement.width,
          placement.depth,
          room,
        );
        const frontMiddle = {
          x: (footprint[0].x + footprint[1].x) / 2,
          y: (footprint[0].y + footprint[1].y) / 2,
        };
        const backMiddle = {
          x: (footprint[3].x + footprint[2].x) / 2,
          y: (footprint[3].y + footprint[2].y) / 2,
        };
        return (
          <g
            key={placement.id}
            onClick={(event) => {
              event.stopPropagation();
              onPlacement(placement.id);
            }}
            onKeyDown={(event) => activateFromKeyboard(event, () => onPlacement(placement.id))}
            className="cursor-pointer"
            data-testid={`cabinet-placement-${placement.id}`}
            role="button"
            tabIndex={0}
            aria-label="בחירת ארון בתכנית"
          >
            <polygon
              data-testid={`cabinet-footprint-${placement.id}`}
              points={footprint.map((point) => `${point.x},${point.y}`).join(' ')}
              fill={placement.id === activePlacementId ? '#b66b3d' : '#956746'}
              stroke={placement.id === activePlacementId ? '#2f241c' : '#513b2c'}
              strokeWidth={placement.id === activePlacementId ? 46 : 28}
            />
            <line
              x1={frontMiddle.x}
              y1={frontMiddle.y}
              x2={backMiddle.x}
              y2={backMiddle.y}
              stroke="#eadbc8"
              strokeWidth="18"
            />
          </g>
        );
      })}
    </svg>
  );
}
