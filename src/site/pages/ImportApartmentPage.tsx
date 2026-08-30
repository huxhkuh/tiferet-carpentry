import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import type { Point } from '../../apartment/types';
import { calibrateImportDraft, createImportDraft, renameImportedRoom } from '../../apartment/import/geometry';
import { buildApartmentFromImport } from '../../apartment/import/model';
import { parsePdfVectorDocument } from '../../apartment/import/pdf-vector-parser';
import type { PdfImportDraft } from '../../apartment/import/types';
import { saveImportedApartment } from '../../apartment/persistence/imported-apartments';
import { DiamondMark } from '../components/DiamondMark';
import type { NavigateSite } from '../types';

type ImportState = 'idle' | 'reading' | 'review' | 'saving' | 'error';

interface ImportMetadataForm {
  projectName: string;
  buildingName: string;
  apartmentName: string;
  floor: string;
  sheet: string;
}

const DEFAULT_METADATA: ImportMetadataForm = {
  projectName: 'פרויקט תפארת',
  buildingName: 'בניין מיובא',
  apartmentName: 'דירה מיובאת',
  floor: '1',
  sheet: 'חדש',
};

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sourceHash(bytes: Uint8Array): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || crypto.subtle === undefined) return undefined;
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', copy)));
}

function inferMetadata(fileName: string): ImportMetadataForm {
  const sheet = /(?:sheet|גיליון)\D{0,12}(\d+[-–]\d+)/i.exec(fileName)?.[1]?.replace('–', '-') ?? 'חדש';
  const floor = /^\d+/.exec(sheet)?.[0] ?? '1';
  return { ...DEFAULT_METADATA, apartmentName: `דירה ${sheet}`, floor, sheet };
}

function pointLabel(point: Point): string {
  return `${Math.round(point.x)}, ${Math.round(point.y)}`;
}

export function ImportApartmentPage({ navigate }: { navigate: NavigateSite }) {
  const [state, setState] = useState<ImportState>('idle');
  const [draft, setDraft] = useState<PdfImportDraft | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [calibrationLengthCm, setCalibrationLengthCm] = useState('300');
  const [metadata, setMetadata] = useState<ImportMetadataForm>(DEFAULT_METADATA);
  const [message, setMessage] = useState('');

  useEffect(
    () => () => {
      if (sourceUrl !== null) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );

  const wallIds = useMemo(() => new Set(draft?.walls.map((wall) => wall.id) ?? []), [draft?.walls]);

  const analyzeFile = async (file: File) => {
    setState('reading');
    setMessage('');
    setDraft(null);
    setCalibrationPoints([]);
    if (sourceUrl !== null) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setMetadata(inferMetadata(file.name));
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const hash = await sourceHash(bytes);
      const document = await parsePdfVectorDocument(bytes);
      const nextDraft = createImportDraft(document, {
        fileName: file.name,
        fileSizeBytes: file.size,
        sourceId: hash === undefined ? `${file.name}-${file.size}` : `pdf-${hash.slice(0, 16)}`,
        sourceSha256: hash,
      });
      setDraft(nextDraft);
      setState('review');
      setMessage(
        nextDraft.rooms.length > 0
          ? 'נוצרה טיוטה. כעת יש לכייל מידה אחת ולאמת את החללים.'
          : 'הקובץ נקרא, אך לא זוהו חללים סגורים. אין לאשר אותו כמודל אדריכלי.',
      );
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'לא ניתן לנתח את קובץ ה‑PDF');
    }
  };

  const selectCalibrationPoint = (event: MouseEvent<SVGSVGElement>) => {
    if (draft === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const point = {
      x: ((event.clientX - bounds.left) / bounds.width) * draft.document.width,
      y: ((event.clientY - bounds.top) / bounds.height) * draft.document.height,
    };
    setCalibrationPoints((current) => (current.length >= 2 ? [point] : [...current, point]));
  };

  const applyCalibration = () => {
    const start = calibrationPoints[0];
    const end = calibrationPoints[1];
    if (draft === null || start === undefined || end === undefined) {
      setMessage('יש לסמן שתי נקודות על קו מידה מוכר.');
      return;
    }
    try {
      setDraft(
        calibrateImportDraft(draft, {
          sourceStart: start,
          sourceEnd: end,
          lengthMm: Number(calibrationLengthCm) * 10,
        }),
      );
      setMessage('קנה המידה חושב. בדקו את שמות החדרים לפני האישור.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'לא ניתן לכייל את התוכנית');
    }
  };

  const approveImport = () => {
    if (draft === null || draft.calibration === null) {
      setMessage('יש להשלים כיול לפני שמירת הדירה.');
      return;
    }
    const floor = Number(metadata.floor);
    if (
      !Number.isInteger(floor) ||
      metadata.apartmentName.trim().length === 0 ||
      metadata.buildingName.trim().length === 0 ||
      metadata.sheet.trim().length === 0
    ) {
      setMessage('יש למלא שם דירה, בניין, קומה וגיליון תקינים.');
      return;
    }
    setState('saving');
    try {
      const apartment = buildApartmentFromImport(draft, {
        projectName: metadata.projectName,
        buildingName: metadata.buildingName,
        apartmentName: metadata.apartmentName,
        floor,
        sheet: metadata.sheet,
      });
      saveImportedApartment(localStorage, apartment);
      const firstRoom = apartment.rooms[0];
      if (firstRoom === undefined) throw new TypeError('לא נמצא חדר לפתיחת המתכנן');
      navigate({ id: 'design', roomId: firstRoom.id, apartmentId: apartment.id });
    } catch (error) {
      setState('review');
      setMessage(error instanceof Error ? error.message : 'לא ניתן לשמור את מודל הדירה');
    }
  };

  return (
    <div className="ng-page bg-[#f5f1e9]" data-testid="pdf-import-page">
      <div className="ng-page-hero ng-page-hero--plan">
        <p className="ng-eyebrow">
          <DiamondMark /> מעבדת תוכניות
        </p>
        <h1>ייבוא תוכנית אדריכלית מ‑PDF</h1>
        <p>המערכת קוראת וקטורים בדפדפן, בונה טיוטת קירות וחללים, ודורשת אימות לפני שימוש במידות.</p>
      </div>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-10" aria-label="ייבוא תוכנית PDF">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-stone-900">1. בחירת קובץ מקור</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                עד 20MB. קובץ וקטורי ייתן תוצאה טובה יותר; PDF סרוק יישמר לעיון אך לא יאושר אוטומטית.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#6f4935] px-6 py-3 font-bold text-white">
              {state === 'reading' ? 'מנתח…' : 'בחרו PDF'}
              <input
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                disabled={state === 'reading'}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) void analyzeFile(file);
                }}
              />
            </label>
          </div>
          {message && (
            <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950" role="status">
              {message}
            </p>
          )}
        </div>

        {draft !== null && (
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
            <div className="min-w-0 space-y-6">
              <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                  <div>
                    <h2 className="font-bold text-stone-900">מקור מול זיהוי</h2>
                    <p className="text-xs text-stone-500">המקור נשאר ללא שינוי; החום מציג את מסות הקיר שנבחרו.</p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                    {draft.document.width}×{draft.document.height} pt
                  </span>
                </div>
                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="min-h-96 border-b border-stone-200 bg-stone-100 lg:border-e lg:border-b-0">
                    {sourceUrl !== null && (
                      <iframe className="h-full min-h-96 w-full" src={sourceUrl} title="תוכנית המקור שהועלתה" />
                    )}
                  </div>
                  <div className="bg-[#f8f5ef] p-3">
                    <p className="mb-2 text-xs font-bold text-stone-600">לחצו שתי נקודות לצורך כיול</p>
                    <svg
                      role="img"
                      aria-label="גאומטריה וקטורית שזוהתה בתוכנית"
                      viewBox={`0 0 ${draft.document.width} ${draft.document.height}`}
                      preserveAspectRatio="none"
                      className="w-full cursor-crosshair border border-stone-300 bg-white"
                      style={{ aspectRatio: `${draft.document.width} / ${draft.document.height}` }}
                      onClick={selectCalibrationPoint}
                    >
                      {draft.document.rectangles.map((rectangle, index) => (
                        <rect
                          key={`${rectangle.x0}-${rectangle.top}-${index}`}
                          x={rectangle.x0}
                          y={rectangle.top}
                          width={rectangle.x1 - rectangle.x0}
                          height={rectangle.bottom - rectangle.top}
                          fill="rgba(87, 83, 78, 0.12)"
                        />
                      ))}
                      {draft.walls.map((wall) => (
                        <rect
                          key={wall.id}
                          x={wall.sourceRect.x0}
                          y={wall.sourceRect.top}
                          width={wall.sourceRect.x1 - wall.sourceRect.x0}
                          height={wall.sourceRect.bottom - wall.sourceRect.top}
                          fill="#8b5a3c"
                        />
                      ))}
                      <rect
                        x={draft.planBounds.x0}
                        y={draft.planBounds.top}
                        width={draft.planBounds.x1 - draft.planBounds.x0}
                        height={draft.planBounds.bottom - draft.planBounds.top}
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="2"
                        strokeDasharray="8 6"
                      />
                      {calibrationPoints.map((point, index) => (
                        <g key={`${point.x}-${point.y}-${index}`}>
                          <circle cx={point.x} cy={point.y} r="8" fill="#0f766e" />
                          <text x={point.x + 12} y={point.y - 12} fontSize="24" fill="#0f766e">
                            {index + 1}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-stone-900">2. כיול לפי מידה כתובה</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  סמנו את שני קצותיה של מידה ברורה בשרטוט והקלידו את הערך בסנטימטרים. אין להשתמש בהערכה.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_10rem_auto] md:items-end">
                  <div className="rounded-xl bg-stone-100 px-3 py-3 text-sm">
                    נקודה 1: {calibrationPoints[0] ? pointLabel(calibrationPoints[0]) : 'לא סומנה'}
                  </div>
                  <div className="rounded-xl bg-stone-100 px-3 py-3 text-sm">
                    נקודה 2: {calibrationPoints[1] ? pointLabel(calibrationPoints[1]) : 'לא סומנה'}
                  </div>
                  <label className="text-sm font-semibold text-stone-700">
                    מידה (ס״מ)
                    <input
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                      type="number"
                      min="1"
                      value={calibrationLengthCm}
                      onChange={(event) => setCalibrationLengthCm(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-xl border border-[#6f4935] px-5 py-2 font-bold text-[#6f4935]"
                    onClick={applyCalibration}
                  >
                    חשבו קנה מידה
                  </button>
                </div>
                {draft.calibration !== null && (
                  <p className="mt-4 text-sm font-bold text-emerald-800">
                    כיול פעיל: {draft.calibration.mmPerSourceUnit.toFixed(4)} מ״מ לכל יחידת מקור
                  </p>
                )}
              </section>
            </div>

            <aside className="min-w-0 space-y-6">
              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-900">תוצאות הזיהוי</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="text-stone-500">מלבנים וקטוריים</dt>
                    <dd className="mt-1 text-xl font-bold">{draft.document.rectangles.length}</dd>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="text-stone-500">מסות קיר</dt>
                    <dd className="mt-1 text-xl font-bold">{wallIds.size}</dd>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="text-stone-500">חללים מוצעים</dt>
                    <dd className="mt-1 text-xl font-bold">{draft.rooms.length}</dd>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="text-stone-500">גובה תקרה</dt>
                    <dd className="mt-1 font-bold">לא ידוע</dd>
                  </div>
                </dl>
                {draft.warnings.length > 0 && (
                  <ul className="mt-4 space-y-2 text-xs leading-5 text-amber-900">
                    {draft.warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-900">3. פרטי הדירה</h2>
                <div className="mt-4 grid gap-3">
                  {(
                    [
                      ['projectName', 'פרויקט'],
                      ['buildingName', 'בניין / מתחם'],
                      ['apartmentName', 'שם הדירה'],
                      ['floor', 'קומה'],
                      ['sheet', 'גיליון'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-sm font-semibold text-stone-700">
                      {label}
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 font-normal"
                        type={key === 'floor' ? 'number' : 'text'}
                        value={metadata[key]}
                        onChange={(event) => setMetadata((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-900">4. אימות שמות חללים</h2>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  הזיהוי הגאומטרי אינו קורא עדיין שמות מתוך גופנים מקודדים.
                </p>
                <div className="mt-4 max-h-64 space-y-2 overflow-auto">
                  {draft.rooms.map((room, index) => (
                    <label key={room.id} className="block text-xs font-semibold text-stone-600">
                      חלל {index + 1}
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
                        value={room.name}
                        onChange={(event) => {
                          try {
                            setDraft(renameImportedRoom(draft, room.id, event.target.value || `חדר ${index + 1}`));
                          } catch {
                            // A transient empty input is represented by the generated room name.
                          }
                        }}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <div className="rounded-3xl bg-[#342e2a] p-6 text-stone-100 shadow-sm">
                <p className="text-sm leading-6 text-stone-300">
                  פתחים, כלים סניטריים וגובה תקרה אינם מאושרים בשלב זה ויישמרו כשדות לא פתורים. לפני ייצור נדרשת מדידה
                  מקצועית בדירה.
                </p>
                <button
                  type="button"
                  disabled={draft.calibration === null || draft.rooms.length === 0 || state === 'saving'}
                  onClick={approveImport}
                  className="mt-5 w-full rounded-2xl bg-[#d7b58c] px-5 py-3 font-bold text-[#342e2a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {state === 'saving' ? 'שומר…' : 'אשרו טיוטה ופתחו במתכנן'}
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
