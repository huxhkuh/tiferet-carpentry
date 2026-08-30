import type { ArchitecturalFixture } from '../types';

interface FixtureBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function fixtureBounds(fixture: ArchitecturalFixture): FixtureBounds {
  const xs = fixture.polygon.map((point) => point.x);
  const ys = fixture.polygon.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

export function ArchitecturalFixture2D({ fixture }: { fixture: ArchitecturalFixture }) {
  const bounds = fixtureBounds(fixture);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const inset = Math.max(24, Math.min(width, height) * 0.12);

  return (
    <g
      data-testid={`architectural-fixture-${fixture.id}`}
      role="img"
      aria-label={fixture.label}
      className="pointer-events-none"
    >
      <polygon
        points={fixture.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="#f8f7f3"
        stroke="#77736d"
        strokeWidth="24"
      />
      {fixture.kind === 'bathtub' || fixture.kind === 'shower' ? (
        <>
          <rect
            x={bounds.left + inset}
            y={bounds.top + inset}
            width={Math.max(0, width - inset * 2)}
            height={Math.max(0, height - inset * 2)}
            rx={fixture.kind === 'bathtub' ? Math.min(width, height) * 0.34 : 18}
            fill="none"
            stroke="#aaa6a0"
            strokeWidth="16"
          />
          {fixture.kind === 'shower' ? (
            <>
              <line
                x1={bounds.left + inset}
                y1={bounds.top + inset}
                x2={bounds.right - inset}
                y2={bounds.bottom - inset}
                stroke="#c4c0ba"
                strokeWidth="12"
              />
              <line
                x1={bounds.right - inset}
                y1={bounds.top + inset}
                x2={bounds.left + inset}
                y2={bounds.bottom - inset}
                stroke="#c4c0ba"
                strokeWidth="12"
              />
            </>
          ) : null}
        </>
      ) : null}
      {fixture.kind === 'toilet' ? (
        <>
          <rect
            x={bounds.left + inset}
            y={bounds.top + inset}
            width={Math.max(0, width - inset * 2)}
            height={Math.max(40, height * 0.28)}
            fill="#e9e6e0"
            stroke="#aaa6a0"
            strokeWidth="14"
          />
          <ellipse
            cx={bounds.centerX}
            cy={bounds.centerY + height * 0.12}
            rx={Math.max(20, width * 0.28)}
            ry={Math.max(28, height * 0.24)}
            fill="none"
            stroke="#8e8a84"
            strokeWidth="16"
          />
        </>
      ) : null}
      {fixture.kind === 'vanity' || fixture.kind === 'sink' ? (
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY}
          rx={Math.max(20, width * 0.28)}
          ry={Math.max(20, height * 0.24)}
          fill="none"
          stroke="#8e8a84"
          strokeWidth="16"
        />
      ) : null}
      {fixture.kind === 'washer' || fixture.kind === 'dryer' ? (
        <circle
          cx={bounds.centerX}
          cy={bounds.centerY}
          r={Math.max(20, Math.min(width, height) * 0.32)}
          fill="none"
          stroke="#8e8a84"
          strokeWidth="16"
        />
      ) : null}
    </g>
  );
}
