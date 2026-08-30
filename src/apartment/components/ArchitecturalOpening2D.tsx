import type { Door, Room, Wall } from '../types';
import { inwardNormalForRoom } from '../geometry/wall-frame';

function pointAlongWall(wall: Wall, distance: number) {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const ratio = length === 0 ? 0 : distance / length;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * ratio,
    y: wall.start.y + (wall.end.y - wall.start.y) * ratio,
  };
}

export function ArchitecturalDoorGraphic({ door, room, wall }: { door: Door; room?: Room; wall: Wall }) {
  const openingStart = pointAlongWall(wall, door.offset);
  const openingEnd = pointAlongWall(wall, door.offset + door.width);

  if (door.swing === 'sliding') {
    const tangentX = (wall.end.x - wall.start.x) / Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const tangentY = (wall.end.y - wall.start.y) / Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    return (
      <g data-testid={`door-swing-${door.id}`} className="pointer-events-none">
        <line
          x1={openingStart.x}
          y1={openingStart.y}
          x2={openingEnd.x}
          y2={openingEnd.y}
          stroke="#6f6a64"
          strokeWidth="22"
        />
        <line
          x1={openingStart.x + tangentX * door.width * 0.18}
          y1={openingStart.y + tangentY * door.width * 0.18}
          x2={openingEnd.x - tangentX * door.width * 0.18}
          y2={openingEnd.y - tangentY * door.width * 0.18}
          stroke="#a29d96"
          strokeWidth="16"
        />
      </g>
    );
  }

  const hinge = door.swing === 'left' ? openingStart : openingEnd;
  const closedEnd = door.swing === 'left' ? openingEnd : openingStart;
  const inward = room ? inwardNormalForRoom(wall, room) : { x: 0, y: 1 };
  const openEnd = { x: hinge.x + inward.x * door.width, y: hinge.y + inward.y * door.width };
  const closedVector = { x: closedEnd.x - hinge.x, y: closedEnd.y - hinge.y };
  const openVector = { x: openEnd.x - hinge.x, y: openEnd.y - hinge.y };
  const sweep = closedVector.x * openVector.y - closedVector.y * openVector.x > 0 ? 1 : 0;

  return (
    <g data-testid={`door-swing-${door.id}`} className="pointer-events-none">
      <line x1={hinge.x} y1={hinge.y} x2={openEnd.x} y2={openEnd.y} stroke="#706a63" strokeWidth="22" />
      <path
        d={`M ${closedEnd.x} ${closedEnd.y} A ${door.width} ${door.width} 0 0 ${sweep} ${openEnd.x} ${openEnd.y}`}
        fill="none"
        stroke="#aaa49d"
        strokeWidth="14"
        strokeDasharray="34 22"
      />
    </g>
  );
}
