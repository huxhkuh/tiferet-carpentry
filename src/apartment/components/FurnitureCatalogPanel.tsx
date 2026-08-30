import { useEffect, useMemo, useRef, useState } from 'react';

import { FURNITURE_CATALOG, type FurnitureCategory, type FurnitureDefinition } from '../furniture/catalog';
import type { FurnitureKind } from '../types';

interface FurnitureCatalogPanelProps {
  roomName: string;
  onAdd: (kind: FurnitureKind) => void;
  onClose: () => void;
}

type CatalogFilter = 'all' | FurnitureCategory;

const CATEGORY_LABELS: readonly [CatalogFilter, string][] = [
  ['all', 'הכול'],
  ['bedroom', 'שינה'],
  ['living', 'סלון'],
  ['dining', 'אירוח'],
  ['kitchen', 'מטבח'],
  ['bathroom', 'רחצה'],
  ['utility', 'שירות'],
  ['decor', 'הלבשה'],
];

const CATEGORY_MARKS: Readonly<Record<FurnitureCategory, string>> = {
  bedroom: '▱',
  living: '◒',
  dining: '◇',
  kitchen: '▤',
  bathroom: '◯',
  utility: '⌁',
  decor: '✦',
};

function dimensionsLabel(item: FurnitureDefinition): string {
  return `${Math.round(item.width / 10)}×${Math.round(item.depth / 10)} ס״מ`;
}

export function FurnitureCatalogPanel({ roomName, onAdd, onClose }: FurnitureCatalogPanelProps) {
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const items = useMemo(
    () => Object.values(FURNITURE_CATALOG).filter((item) => filter === 'all' || item.category === filter),
    [filter],
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="קטלוג ריהוט"
        className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-t-3xl bg-[#f7f3ec] shadow-2xl sm:rounded-3xl"
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#8b5a3c]">ספריית החלל</p>
            <h2 id="furniture-catalog-title" className="mt-1 text-2xl font-semibold text-stone-900">
              הוספת ריהוט אל {roomName}
            </h2>
            <p className="mt-1 text-sm text-stone-500">הפריט ימוקם אוטומטית במקום פנוי ויישאר ניתן לגרירה ולסיבוב.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="סגירת קטלוג ריהוט"
            onClick={onClose}
            className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xl text-stone-700 hover:bg-stone-100"
          >
            ×
          </button>
        </header>

        <div
          className="border-b border-stone-200 bg-white px-4 py-3 sm:px-7"
          role="tablist"
          aria-label="קטגוריות ריהוט"
        >
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_LABELS.map(([category, label]) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={filter === category}
                onClick={() => setFilter(category)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${filter === category ? 'bg-[#342e2a] text-white' : 'border border-stone-200 bg-white text-stone-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-4 sm:p-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.kind}
                type="button"
                aria-label={`הוסף ${item.label}`}
                onClick={() => onAdd(item.kind)}
                className="group rounded-2xl border border-stone-200 bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-[#b88a68] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee4d8] text-2xl text-[#6f4935] group-hover:bg-[#e4d2c1]">
                  {CATEGORY_MARKS[item.category]}
                </span>
                <strong className="mt-4 block text-base text-stone-900">{item.label}</strong>
                <span className="mt-1 block text-xs text-stone-500">{dimensionsLabel(item)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
