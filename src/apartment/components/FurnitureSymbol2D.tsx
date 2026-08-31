import type { FurnitureAppearance } from '../furniture/catalog';
import type { FurniturePlacement } from '../types';

interface Props {
  item: FurniturePlacement;
  appearance: FurnitureAppearance;
}

function FrontDirection({ item, color }: { item: FurniturePlacement; color: string }) {
  const markerSize = Math.max(55, Math.min(item.width, item.depth) * 0.16);
  const frontY = -item.depth / 2;
  return (
    <g data-testid={`furniture-front-${item.id}`} aria-hidden="true">
      <path
        d={`M ${-markerSize} ${frontY - markerSize * 0.45} L 0 ${frontY - markerSize * 1.35} L ${markerSize} ${frontY - markerSize * 0.45}`}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(18, markerSize * 0.2)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function BedSymbol({ item, appearance }: Props) {
  const pillowWidth = item.width * 0.34;
  const pillowHeight = Math.min(item.depth * 0.16, 360);
  return (
    <>
      <rect
        x={-item.width / 2 + item.width * 0.04}
        y={-item.depth / 2 + item.depth * 0.04}
        width={item.width * 0.92}
        height={item.depth * 0.92}
        rx={Math.min(item.width, item.depth) * 0.06}
        fill={appearance.soft}
        stroke={appearance.accent}
        strokeWidth="24"
      />
      <line
        data-testid={`furniture-back-${item.id}`}
        x1={-item.width / 2}
        y1={item.depth / 2}
        x2={item.width / 2}
        y2={item.depth / 2}
        stroke={appearance.accent}
        strokeWidth="70"
      />
      {[-1, 1].map((side) => (
        <rect
          key={side}
          x={side < 0 ? -pillowWidth - item.width * 0.04 : item.width * 0.04}
          y={item.depth / 2 - pillowHeight - item.depth * 0.08}
          width={pillowWidth}
          height={pillowHeight}
          rx={pillowHeight * 0.22}
          fill="#fffdf8"
          stroke={appearance.accent}
          strokeWidth="14"
        />
      ))}
    </>
  );
}

function ChairSymbol({ item, appearance }: Props) {
  const inset = Math.min(item.width, item.depth) * 0.12;
  return (
    <>
      <rect
        x={-item.width / 2 + inset}
        y={-item.depth / 2 + inset}
        width={item.width - inset * 2}
        height={item.depth - inset * 2}
        rx={inset}
        fill={appearance.soft}
        stroke={appearance.accent}
        strokeWidth="22"
      />
      <line
        data-testid={`furniture-back-${item.id}`}
        x1={-item.width / 2 + inset / 2}
        y1={item.depth / 2 - inset / 2}
        x2={item.width / 2 - inset / 2}
        y2={item.depth / 2 - inset / 2}
        stroke={appearance.accent}
        strokeWidth={Math.max(30, inset * 0.75)}
        strokeLinecap="round"
      />
    </>
  );
}

function SofaSymbol({ item, appearance }: Props) {
  const arm = Math.min(item.width, item.depth) * 0.13;
  return (
    <>
      <rect
        x={-item.width / 2 + arm}
        y={-item.depth / 2 + arm * 0.55}
        width={item.width - arm * 2}
        height={item.depth - arm * 1.55}
        rx={arm * 0.7}
        fill={appearance.soft}
        stroke={appearance.accent}
        strokeWidth="22"
      />
      <line
        data-testid={`furniture-back-${item.id}`}
        x1={-item.width / 2 + arm}
        y1={item.depth / 2 - arm * 0.42}
        x2={item.width / 2 - arm}
        y2={item.depth / 2 - arm * 0.42}
        stroke={appearance.accent}
        strokeWidth={arm * 0.7}
        strokeLinecap="round"
      />
      {[-1, 1].map((side) => (
        <rect
          key={side}
          x={side < 0 ? -item.width / 2 + arm * 0.1 : item.width / 2 - arm * 0.75}
          y={-item.depth / 2 + arm * 0.25}
          width={arm * 0.65}
          height={item.depth - arm * 0.7}
          rx={arm * 0.3}
          fill={appearance.primary}
        />
      ))}
    </>
  );
}

function TableSymbol({ item, appearance }: Props) {
  const radius = item.kind === 'coffee-table' ? Math.min(item.width, item.depth) * 0.18 : 34;
  return (
    <>
      <rect
        x={-item.width / 2 + 22}
        y={-item.depth / 2 + 22}
        width={item.width - 44}
        height={item.depth - 44}
        rx={radius}
        fill={item.material === 'glass' ? '#d9eef0' : appearance.primary}
        fillOpacity={item.material === 'glass' ? 0.65 : 0.92}
        stroke={appearance.accent}
        strokeWidth="24"
      />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([xSide, ySide]) => (
        <circle
          key={`${xSide}-${ySide}`}
          cx={xSide * (item.width / 2 - 76)}
          cy={ySide * (item.depth / 2 - 76)}
          r="24"
          fill={appearance.accent}
        />
      ))}
    </>
  );
}

function ApplianceSymbol({ item, appearance }: Props) {
  return (
    <>
      <rect
        x={-item.width / 2 + 18}
        y={-item.depth / 2 + 18}
        width={item.width - 36}
        height={item.depth - 36}
        rx="38"
        fill={appearance.soft}
        stroke={appearance.accent}
        strokeWidth="24"
      />
      <circle
        cx="0"
        cy="0"
        r={Math.min(item.width, item.depth) * 0.3}
        fill="none"
        stroke={appearance.accent}
        strokeWidth="26"
      />
    </>
  );
}

function GenericSymbol({ item, appearance }: Props) {
  const inset = Math.min(item.width, item.depth) * 0.08;
  return (
    <rect
      x={-item.width / 2 + inset}
      y={-item.depth / 2 + inset}
      width={item.width - inset * 2}
      height={item.depth - inset * 2}
      rx={item.style === 'soft' ? Math.min(item.width, item.depth) * 0.16 : 24}
      fill={appearance.primary}
      stroke={appearance.accent}
      strokeWidth="22"
    />
  );
}

export function FurnitureSymbol2D({ item, appearance }: Props) {
  const angle = (item.rotation * 180) / Math.PI;
  const isBed = item.kind === 'single-bed' || item.kind === 'double-bed';
  const isTable = item.kind === 'coffee-table' || item.kind === 'dining-table' || item.kind === 'desk';
  const isAppliance = item.kind === 'washer' || item.kind === 'dryer';
  return (
    <g transform={`translate(${item.x} ${item.y}) rotate(${angle})`} className="pointer-events-none" aria-hidden="true">
      {isBed ? <BedSymbol item={item} appearance={appearance} /> : null}
      {item.kind === 'dining-chair' ? <ChairSymbol item={item} appearance={appearance} /> : null}
      {item.kind === 'sofa' ? <SofaSymbol item={item} appearance={appearance} /> : null}
      {isTable ? <TableSymbol item={item} appearance={appearance} /> : null}
      {isAppliance ? <ApplianceSymbol item={item} appearance={appearance} /> : null}
      {!isBed && item.kind !== 'dining-chair' && item.kind !== 'sofa' && !isTable && !isAppliance ? (
        <GenericSymbol item={item} appearance={appearance} />
      ) : null}
      {item.kind !== 'rug' ? <FrontDirection item={item} color={appearance.accent} /> : null}
    </g>
  );
}
