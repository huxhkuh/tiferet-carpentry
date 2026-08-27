import type { DesignVisibility, SceneObjectCategory } from '../types';

interface SceneLayersPanelProps {
  visibility: DesignVisibility;
  onToggleCategory(category: SceneObjectCategory): void;
  onShowAll(): void;
}

const LAYERS: ReadonlyArray<{
  category: SceneObjectCategory;
  label: string;
  shortLabel: string;
}> = [
  { category: 'cabinetry', label: 'שכבת ארונות ונגרות', shortLabel: 'נגרות' },
  { category: 'beds', label: 'שכבת מיטות ושינה', shortLabel: 'שינה' },
  { category: 'kitchen', label: 'שכבת מטבח', shortLabel: 'מטבח' },
  { category: 'bathroom', label: 'שכבת חדרי רחצה', shortLabel: 'רחצה' },
  { category: 'living', label: 'שכבת סלון ואירוח', shortLabel: 'אירוח' },
  { category: 'work', label: 'שכבת עבודה ואחסון', shortLabel: 'עבודה' },
  { category: 'utility', label: 'שכבת שירות וכביסה', shortLabel: 'שירות' },
  { category: 'decor', label: 'שכבת עיצוב והלבשה', shortLabel: 'הלבשה' },
];

export function SceneLayersPanel({ visibility, onToggleCategory, onShowAll }: SceneLayersPanelProps) {
  const hiddenObjectCount = visibility.hiddenObjectIds.length;
  const hasHiddenItems = hiddenObjectCount > 0 || visibility.hiddenCategories.length > 0;
  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-stone-700">שכבות התכנון</p>
          {hiddenObjectCount > 0 ? (
            <p className="mt-1 text-xs text-stone-500">
              {hiddenObjectCount === 1 ? 'פריט מוסתר אחד' : `${hiddenObjectCount} פריטים מוסתרים`}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onShowAll}
          disabled={!hasHiddenItems}
          className="rounded-lg px-2 py-1 text-xs font-bold text-[#75472e] hover:bg-amber-50 disabled:cursor-default disabled:text-stone-400"
        >
          הצג את כל הפריטים
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="שכבות התכנון">
        {LAYERS.map(({ category, label, shortLabel }) => {
          const visible = !visibility.hiddenCategories.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-label={label}
              aria-pressed={visible}
              onClick={() => onToggleCategory(category)}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-start text-xs font-semibold transition ${
                visible
                  ? 'border-stone-200 bg-white text-stone-700 shadow-sm'
                  : 'border-transparent bg-stone-200/70 text-stone-500'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${visible ? 'bg-emerald-600' : 'bg-stone-400'}`}
              />
              {shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
