import type { FurnitureMaterial, FurniturePlacement, FurnitureStyle } from '../types';

type FurnitureAppearancePatch = Partial<Pick<FurniturePlacement, 'color' | 'accentColor' | 'material' | 'style'>>;

interface FurnitureEditorProps {
  item: FurniturePlacement;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange: (radians: number) => void;
  onDimensionsChange: (width: number, depth: number, height: number) => void;
  onAppearanceChange: (patch: FurnitureAppearancePatch) => void;
  onSnapToGrid: () => void;
  onSnapToWall: () => void;
  onHide: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const NUDGE_MM = 100;
const RIGHT_ANGLE_RADIANS = Math.PI / 2;
const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-[#7b4f35] focus:ring-2 focus:ring-[#7b4f35]/20 focus:outline-none';

const MATERIAL_LABELS: readonly [FurnitureMaterial, string][] = [
  ['wood', 'עץ'],
  ['fabric', 'בד'],
  ['metal', 'מתכת'],
  ['glass', 'זכוכית'],
  ['ceramic', 'קרמיקה'],
  ['painted', 'גמר צבוע'],
];

const STYLE_LABELS: readonly [FurnitureStyle, string][] = [
  ['minimal', 'מינימליסטי'],
  ['classic', 'קלאסי'],
  ['soft', 'רך ומעוגל'],
  ['architectural', 'אדריכלי'],
];

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

export function FurnitureEditor({
  item,
  onPositionChange,
  onRotationChange,
  onDimensionsChange,
  onAppearanceChange,
  onSnapToGrid,
  onSnapToWall,
  onHide,
  onDuplicate,
  onDelete,
}: FurnitureEditorProps) {
  const xInputId = `${item.id}-furniture-x`;
  const yInputId = `${item.id}-furniture-y`;
  const rotationInputId = `${item.id}-furniture-rotation`;
  const widthInputId = `${item.id}-furniture-width`;
  const depthInputId = `${item.id}-furniture-depth`;
  const heightInputId = `${item.id}-furniture-height`;
  const colorInputId = `${item.id}-furniture-color`;
  const accentColorInputId = `${item.id}-furniture-accent-color`;
  const materialInputId = `${item.id}-furniture-material`;
  const styleInputId = `${item.id}-furniture-style`;

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
        <div className="flex flex-wrap justify-end gap-2">
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
            >
              שכפל פריט
            </button>
          )}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              מחק פריט
            </button>
          ) : (
            <button
              type="button"
              onClick={onHide}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4f35]"
            >
              הסתר פריט
            </button>
          )}
        </div>
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <fieldset className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
        <legend className="px-1 text-sm font-bold text-stone-800">מידות הפריט</legend>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs font-semibold text-stone-700" htmlFor={widthInputId}>
            רוחב בס״מ
            <input
              id={widthInputId}
              type="number"
              inputMode="decimal"
              min="1"
              value={millimetresToCentimetres(item.width)}
              onChange={(event) =>
                onDimensionsChange(centimetresToMillimetres(event.target.value), item.depth, item.height)
              }
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-semibold text-stone-700" htmlFor={depthInputId}>
            עומק בס״מ
            <input
              id={depthInputId}
              type="number"
              inputMode="decimal"
              min="1"
              value={millimetresToCentimetres(item.depth)}
              onChange={(event) =>
                onDimensionsChange(item.width, centimetresToMillimetres(event.target.value), item.height)
              }
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-semibold text-stone-700" htmlFor={heightInputId}>
            גובה בס״מ
            <input
              id={heightInputId}
              type="number"
              inputMode="decimal"
              min="1"
              value={millimetresToCentimetres(item.height)}
              onChange={(event) =>
                onDimensionsChange(item.width, item.depth, centimetresToMillimetres(event.target.value))
              }
              className={INPUT_CLASS}
            />
          </label>
        </div>
      </fieldset>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-stone-700" htmlFor={rotationInputId}>
          סיבוב במעלות
          <input
            id={rotationInputId}
            type="number"
            inputMode="decimal"
            value={radiansToDegrees(item.rotation)}
            onChange={(event) => onRotationChange(degreesToRadians(event.target.value))}
            className={INPUT_CLASS}
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

      <fieldset className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
        <legend className="px-1 text-sm font-bold text-stone-800">חומר ומראה</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-stone-700" htmlFor={materialInputId}>
            חומר
            <select
              id={materialInputId}
              value={item.material ?? 'wood'}
              onChange={(event) => onAppearanceChange({ material: event.target.value as FurnitureMaterial })}
              className={INPUT_CLASS}
            >
              {MATERIAL_LABELS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-700" htmlFor={styleInputId}>
            סגנון
            <select
              id={styleInputId}
              value={item.style ?? 'minimal'}
              onChange={(event) => onAppearanceChange({ style: event.target.value as FurnitureStyle })}
              className={INPUT_CLASS}
            >
              {STYLE_LABELS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-700" htmlFor={colorInputId}>
            צבע ראשי
            <input
              id={colorInputId}
              type="color"
              value={item.color ?? '#9a7457'}
              onChange={(event) => onAppearanceChange({ color: event.target.value })}
              className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-stone-300 bg-white p-1"
            />
          </label>
          <label className="text-xs font-semibold text-stone-700" htmlFor={accentColorInputId}>
            צבע משני
            <input
              id={accentColorInputId}
              type="color"
              value={item.accentColor ?? '#5f4636'}
              onChange={(event) => onAppearanceChange({ accentColor: event.target.value })}
              className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-stone-300 bg-white p-1"
            />
          </label>
        </div>
      </fieldset>

      <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="הצמדת פריט">
        <button
          type="button"
          aria-label="הצמד לרשת של 5 ס״מ"
          onClick={onSnapToGrid}
          className="rounded-lg border border-[#b88a68] bg-[#f4e9dc] px-3 py-2 text-sm font-bold text-[#6f4935] hover:bg-[#ead8c5]"
        >
          ⌗ רשת 5 ס״מ
        </button>
        <button
          type="button"
          aria-label="הצמד לקיר הקרוב"
          onClick={onSnapToWall}
          className="rounded-lg border border-[#b88a68] bg-[#f4e9dc] px-3 py-2 text-sm font-bold text-[#6f4935] hover:bg-[#ead8c5]"
        >
          ▰ הצמד לקיר
        </button>
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
