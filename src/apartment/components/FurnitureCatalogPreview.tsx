import { getFurnitureAppearance, type FurnitureDefinition } from '../furniture/catalog';
import type { FurniturePlacement } from '../types';
import { FurnitureSymbol2D } from './FurnitureSymbol2D';

interface Props {
  definition: FurnitureDefinition;
}

export function FurnitureCatalogPreview({ definition }: Props) {
  const item: FurniturePlacement = {
    id: `catalog-${definition.kind}`,
    roomId: 'catalog',
    kind: definition.kind,
    label: definition.label,
    x: 0,
    y: 0,
    width: definition.width,
    depth: definition.depth,
    height: definition.height,
    elevation: definition.elevation ?? 0,
    rotation: 0,
    material: 'wood',
    style: 'soft',
  };
  const padding = Math.max(definition.width, definition.depth) * 0.24;
  return (
    <svg
      role="img"
      aria-label={`המחשת ${definition.label}`}
      viewBox={`${-definition.width / 2 - padding} ${-definition.depth / 2 - padding} ${definition.width + padding * 2} ${definition.depth + padding * 2}`}
      className="h-24 w-full overflow-visible"
    >
      <FurnitureSymbol2D item={item} appearance={getFurnitureAppearance(item, 'warm')} />
    </svg>
  );
}
