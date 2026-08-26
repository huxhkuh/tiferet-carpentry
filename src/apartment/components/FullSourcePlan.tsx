import { useState } from 'react';

const SOURCE_WIDTH = 6_300;
const SOURCE_HEIGHT = 3_314;
const SOURCE_IMAGE_URL = `${import.meta.env.BASE_URL}tiferet/sheet-5-1-full.png`;
const SOURCE_PDF_URL = `${import.meta.env.BASE_URL}tiferet/sheet-5-1-original.pdf`;

export function FullSourcePlan() {
  const [fitToViewport, setFitToViewport] = useState(true);

  return (
    <article className="flex h-full min-h-96 flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <div>
          <strong className="block text-sm">תצוגת מקור מלאה</strong>
          <span className="text-xs text-stone-600">גיליון 5-1 הרשמי · ללא חיתוך או שרטוט מחדש</span>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="קנה מידה של גיליון המקור">
          <button
            type="button"
            aria-pressed={fitToViewport}
            onClick={() => setFitToViewport(true)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${fitToViewport ? 'border-[#7b4f35] bg-[#efe4d6] text-[#653e28]' : 'border-stone-300 bg-white text-stone-700'}`}
          >
            התאם למסך
          </button>
          <button
            type="button"
            aria-pressed={!fitToViewport}
            onClick={() => setFitToViewport(false)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${!fitToViewport ? 'border-[#7b4f35] bg-[#efe4d6] text-[#653e28]' : 'border-stone-300 bg-white text-stone-700'}`}
          >
            100% — פיקסל מול פיקסל
          </button>
          <a
            href={SOURCE_PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 underline-offset-4 hover:underline"
          >
            פתח PDF מקורי
          </a>
        </div>
      </div>
      <div
        data-testid="full-source-plan-scroll"
        className="min-h-0 flex-1 overflow-auto bg-[#d8d4cd] p-3 sm:p-5"
        role="region"
        aria-label="אזור גלילה של גיליון 5-1"
      >
        <a href={SOURCE_PDF_URL} target="_blank" rel="noreferrer" aria-label="פתח את גיליון 5-1 כקובץ PDF">
          <img
            src={SOURCE_IMAGE_URL}
            alt="גיליון 5-1 המקורי במלואו"
            width={SOURCE_WIDTH}
            height={SOURCE_HEIGHT}
            draggable={false}
            className={`mx-auto block h-auto bg-white shadow-lg ${fitToViewport ? 'w-full' : 'max-w-none'}`}
          />
        </a>
      </div>
    </article>
  );
}
