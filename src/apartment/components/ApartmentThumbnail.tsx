import type { Apartment } from '../types';

interface ApartmentThumbnailProps {
  apartment: Apartment;
}

export function ApartmentThumbnail({ apartment }: ApartmentThumbnailProps) {
  const points = [
    ...apartment.rooms.flatMap((room) => room.polygon),
    ...apartment.fixedElements.flatMap((element) => element.polygon),
    ...(apartment.wallMasses ?? []).flatMap((wallMass) => wallMass.polygon),
  ];
  const padding = 260;
  const minX = Math.min(...points.map((point) => point.x)) - padding;
  const minY = Math.min(...points.map((point) => point.y)) - padding;
  const maxX = Math.max(...points.map((point) => point.x)) + padding;
  const maxY = Math.max(...points.map((point) => point.y)) + padding;

  return (
    <svg
      className="h-full w-full"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      role="img"
      aria-label={`תצוגה מקדימה של ${apartment.name}`}
    >
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} rx="180" fill="#eee6d7" />
      {apartment.fixedElements.map((element) => (
        <polygon
          key={element.id}
          points={element.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
          fill={element.kind === 'balcony-void' ? '#e7ddca' : '#d8c6aa'}
          stroke="#9b8265"
          strokeWidth="38"
          strokeDasharray="90 54"
        />
      ))}
      {apartment.rooms.map((room, index) => {
        const center = room.polygon.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
          x: 0,
          y: 0,
        });
        return (
          <g key={room.id}>
            <polygon
              points={room.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
              fill={index % 2 === 0 ? '#fffdf8' : '#f6f0e5'}
            />
            <text
              x={center.x / room.polygon.length}
              y={center.y / room.polygon.length}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#66594d"
              fontSize="120"
              fontWeight="700"
            >
              {room.name}
            </text>
          </g>
        );
      })}
      {(apartment.wallMasses ?? []).map((wallMass) => (
        <polygon
          key={wallMass.id}
          data-testid={`thumbnail-wall-mass-${wallMass.id}`}
          points={wallMass.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="#4a443e"
        />
      ))}
      {!apartment.wallMasses?.length &&
        apartment.walls.map((wall) => (
          <line
            key={wall.id}
            x1={wall.start.x}
            y1={wall.start.y}
            x2={wall.end.x}
            y2={wall.end.y}
            stroke="#4a443e"
            strokeWidth={wall.thickness ?? 95}
            strokeLinecap="square"
          />
        ))}
    </svg>
  );
}
