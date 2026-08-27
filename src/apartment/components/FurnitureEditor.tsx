import type { FurniturePlacement } from '../types';

interface FurnitureEditorProps {
  item: FurniturePlacement;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange: (radians: number) => void;
  onHide: () => void;
}

const NUDGE_MM = 100;
const RIGHT_ANGLE_RADIANS = Math.PI / 2;

function millimetresToCentimetres(value: number): number {
  return Math.round(value / 10);
}

function centimetresToMillimetres(value: string): number {
  return Math.round(Number(value) * 10);
}

function radiansToDegrees(value: number): number {
  return Math.round((value * 180) / Math.PI);
}

function degreesToRadians(value: string): number {
  return (Number(value) * Math.PI) / 180;
}

export function FurnitureEditor({ item, onPositionChange, onRotationChange, onHide }: FurnitureEditorProps) {
  const xInputId = `${item.id}-furniture-x`;
  const yInputId = `${item.id}-furniture-y`;
  const rotationInputId = `${item.id}-furniture-rotation`;

  return (
    <section
      aria-labelledby={`${item.id}-furniture-editor-title`}
      className="rounded-2xl border border-stone-200 bg-white/95 p-4 text-start shadow-sm"
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#7b4f35]">ריהוט בחדר</p>
          <h3 id={`${item.id}-furniture-editor-title`} className="mt-1 text-xl font-semibold text-stone-900">
            עריכת {item.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
        >
          הסתר פריט
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-stone-700" htmlFor={xInputId}>
          מיקום X בס״מ
          <input
            id={xInputId}
            type="number"
            inputMode="decimal"
            value={millimetresToCentimetres(item.x)}
            onChange={(event) => onPositionChange(centimetresToMillimetres(event.target.value), item.y)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-[#7b4f35] focus:ring-2 focus:ring-[#7b4f35]/20 focus:outline-none"
          />
        </label>
        <label className="block text-sm font-semibold text-stone-700" htmlFor={yInputId}>
          מיקום Y בס״מ
          <input
            id={yInputId}
            type="number"
            inputMode="decimal"
            value={millimetresToCentimetres(item.y)}
            onChange={(event) => onPositionChange(item.x, centimetresToMillimetres(event.target.value))}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-[#7b4f35] focus:ring-2 focus:ring-[#7b4f35]/20 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-stone-700" htmlFor={rotationInputId}>
          סיבוב במעלות
          <input
            id={rotationInputId}
            type="number"
            inputMode="decimal"
            value={radiansToDegrees(item.rotation)}
            onChange={(event) => onRotationChange(degreesToRadians(event.target.value))}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-[#7b4f35] focus:ring-2 focus:ring-[#7b4f35]/20 focus:outline-none"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="סובב ימינה 90°"
            onClick={() => onRotationChange(item.rotation + RIGHT_ANGLE_RADIANS)}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
          >
            ↻ 90°
          </button>
          <button
            type="button"
            aria-label="סובב שמאלה 90°"
            onClick={() => onRotationChange(item.rotation - RIGHT_ANGLE_RADIANS)}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
          >
            ↺ 90°
          </button>
        </div>
      </div>

      <div className="mt-4" role="group" aria-label="הזזת פריט">
        <p className="mb-2 text-sm font-semibold text-stone-700">הזזה מדויקת</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="הזז למעלה 10 ס״מ"
            onClick={() => onPositionChange(item.x, item.y - NUDGE_MM)}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-bold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
          >
            ↑ 10 ס״מ
          </button>
          <button
            type="button"
            aria-label="הזז למטה 10 ס״מ"
            onClick={() => onPositionChange(item.x, item.y + NUDGE_MM)}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-bold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
          >
            ↓ 10 ס״מ
          </button>
          <button
            type="button"
            aria-label="הזז ימינה 10 ס״מ"
            onClick={() => onPositionChange(item.x + NUDGE_MM, item.y)}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-bold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
          >
            → 10 ס״מ
          </button>
          <button
            type="button"
            aria-label="הזז שמאלה 10 ס״מ"
            onClick={() => onPositionChange(item.x - NUDGE_MM, item.y)}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-bold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
          >
            ← 10 ס״מ
          </button>
        </div>
      </div>
    </section>
  );
}
