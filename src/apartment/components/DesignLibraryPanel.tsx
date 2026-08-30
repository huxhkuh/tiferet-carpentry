import type { ChangeEvent } from 'react';
import type { ArchitecturalPdfImportDraft } from '../import/pdf-import';
import type { SavedDesignLibrary } from '../persistence/design-library';

interface DesignLibraryPanelProps {
  library: SavedDesignLibrary;
  designName: string;
  onNameChange: (name: string) => void;
  onSaveAsNew: () => void;
  onLoad: (designId: string) => void;
  onDelete: (designId: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onImportPdf: (file: File) => void;
  pdfImportDraft: ArchitecturalPdfImportDraft | null;
  pdfImportState: 'idle' | 'reading' | 'ready' | 'error';
  onClose: () => void;
}

export function DesignLibraryPanel({
  library,
  designName,
  onNameChange,
  onSaveAsNew,
  onLoad,
  onDelete,
  onExport,
  onImport,
  onImportPdf,
  pdfImportDraft,
  pdfImportState,
  onClose,
}: DesignLibraryPanelProps) {
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = '';
  };
  const handlePdfImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportPdf(file);
    event.target.value = '';
  };
  const statusLabel =
    pdfImportDraft?.status === 'draft-ready'
      ? 'טיוטת ייבוא מוכנה'
      : pdfImportDraft?.status === 'needs-manual-review'
        ? 'נדרש סבב בדיקה'
        : 'נדרש PDF וקטורי';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/35">
      <button
        type="button"
        aria-label="סגירת החלון בלחיצה מחוץ לספרייה"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-library-title"
        className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-[#f8f5ee] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-300 pb-5">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#8a5b3e]">תכנון מקומי ומאובטח</p>
            <h2 id="design-library-title" className="mt-2 text-3xl font-semibold text-stone-900">
              גרסאות ושיתוף
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירת ספריית גרסאות" className="text-2xl text-stone-500">
            ×
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
          <label htmlFor="design-version-name" className="text-sm font-bold text-stone-700">
            שם הגרסה
          </label>
          <input
            id="design-version-name"
            value={designName}
            onChange={(event) => onNameChange(event.target.value)}
            maxLength={80}
            className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-3"
            placeholder="למשל: חלופה בהירה"
          />
          <button
            type="button"
            onClick={onSaveAsNew}
            disabled={designName.trim().length === 0}
            className="mt-3 w-full rounded-xl bg-[#6d4630] px-4 py-3 font-bold text-white disabled:bg-stone-300"
          >
            שמור כגרסה חדשה
          </button>
        </div>

        <section className="mt-7" aria-label="גרסאות שמורות">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-stone-800">הגרסאות שלי</h3>
            <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-600">
              {library.designs.length}
            </span>
          </div>
          {library.designs.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
              עדיין לא נשמרו חלופות. התכנון נשמר בדפדפן בלבד.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {library.designs.map((design) => (
                <li key={design.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-stone-900">{design.name}</strong>
                      <p className="mt-1 text-xs text-stone-500">
                        {new Date(design.updatedAt).toLocaleString('he-IL')} · {design.placements.length} פריטי נגרות
                      </p>
                    </div>
                    {library.activeDesignId === design.id && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                        פעילה
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      aria-label={`טען גרסה ${design.name}`}
                      onClick={() => onLoad(design.id)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700"
                    >
                      טען
                    </button>
                    <button
                      type="button"
                      aria-label={`מחק גרסה ${design.name}`}
                      onClick={() => onDelete(design.id)}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-red-700"
                    >
                      מחק
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="mt-8 grid gap-3 border-t border-stone-300 pt-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={onExport}
            disabled={library.activeDesignId === null}
            className="rounded-xl border border-[#6d4630] px-3 py-3 text-sm font-bold text-[#6d4630] disabled:border-stone-300 disabled:text-stone-400"
          >
            ייצוא גרסה פעילה ל‑JSON
          </button>
          <label className="cursor-pointer rounded-xl border border-stone-300 px-3 py-3 text-center text-sm font-bold text-stone-700">
            ייבוא תכנון JSON
            <input className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} />
          </label>
        </div>
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4" aria-label="קליטת תוכנית PDF">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-stone-800">ייבוא PDF אדריכלי</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                העלו גיליון וקטורי כדי לקבל טיוטת ראיות לפני בניית מודל דירה.
              </p>
            </div>
            {pdfImportState === 'reading' && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">קורא</span>
            )}
          </div>
          <label className="mt-4 block cursor-pointer rounded-xl border border-[#6d4630] px-3 py-3 text-center text-sm font-bold text-[#6d4630]">
            ייבוא PDF אדריכלי
            <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={handlePdfImport} />
          </label>
          {pdfImportState === 'error' && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
              לא ניתן לקרוא את קובץ ה-PDF
            </p>
          )}
          {pdfImportDraft && (
            <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-stone-900">{statusLabel}</p>
                  <p className="mt-1 text-xs text-stone-500">{pdfImportDraft.fileName}</p>
                </div>
                <span className="rounded-full bg-stone-200 px-2 py-1 text-xs font-bold text-stone-600">
                  {pdfImportDraft.pageCount || 'לא ידוע'} עמודים
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-bold text-stone-500">קווי וקטור</dt>
                  <dd>{pdfImportDraft.vectorSummary.lineSegments}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-500">מלבנים</dt>
                  <dd>{pdfImportDraft.vectorSummary.rectangles}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-500">מועמדי קיר</dt>
                  <dd>{pdfImportDraft.vectorSummary.wallCandidates}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-500">מידות מטקסט</dt>
                  <dd>{pdfImportDraft.vectorSummary.dimensionCandidates.length}</dd>
                </div>
              </dl>
              <ul className="mt-3 space-y-1 text-xs text-stone-500">
                {pdfImportDraft.qualityFlags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          קובץ ה‑JSON כולל את מיקומי הנגרות, הריהוט, שכבות התצוגה והמצלמה — ללא פרטי חשבון או מידע שנשלח לשרת.
        </p>
      </aside>
    </div>
  );
}
