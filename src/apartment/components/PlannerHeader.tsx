import { apartmentSourceLabel } from '../source/display';
import { TIFERET_5_1 } from '../data/tiferet';
import { useState, useRef, useEffect } from 'react';
import { BrandMark } from '../../site/components/BrandMark';

import type { PlannerController } from '../planner/use-planner-controller';
export function PlannerHeader({ controller }: { controller: PlannerController }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!actionsOpen) return;
    headerRef.current?.querySelector<HTMLButtonElement>('.planner-secondary-action')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && event.target instanceof Node && headerRef.current?.contains(event.target)) {
        setActionsOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [actionsOpen]);
  const {
    view,
    setView,
    setMobilePanel,
    building,
    floor,
    apartment,
    setShowDesignLibrary,
    historyRef,
    undo,
    redo,
    draftStatus,
    leave,
    save,
    onExit,
    initialApartment,
    onSummary,
  } = controller;
  return (
    <header
      ref={headerRef}
      className="planner-header sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8"
      data-actions-open={actionsOpen}
    >
      <div className="planner-branding flex items-center gap-3">
        <BrandMark compact />
        <div>
          <h1 className="block text-lg font-bold text-[#5f402f]">נגרות תפארת</h1>
          <p className="text-xs text-stone-500">
            {initialApartment
              ? `${apartment.source.building} • קומה ${apartment.source.floor} • ${apartment.name}`
              : `${building?.name} • קומה ${floor?.number} • ${apartmentSourceLabel(apartment)}`}
          </p>
        </div>
      </div>
      <div id="planner-header-actions" className="planner-header-actions flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowDesignLibrary(true)}
          className="planner-secondary-action rounded-xl border border-stone-300 bg-white px-4 py-2 font-bold text-stone-700"
        >
          גרסאות ושיתוף
        </button>
        <button onClick={save} className="planner-save rounded-xl bg-[#7b4f35] px-5 py-2 font-bold text-white">
          שמור תכנון
        </button>
        <span role="status" aria-label="מצב שמירה" className="planner-save-status text-sm text-stone-700">
          {draftStatus === 'saved'
            ? 'הטיוטה נשמרה במכשיר'
            : draftStatus === 'error'
              ? 'הטיוטה לא נשמרה — הורידו עותק'
              : 'שומר טיוטה…'}
        </span>
        {onSummary && (
          <button
            onClick={() => leave(onSummary)}
            className="planner-secondary-action rounded-xl border border-[#7b4f35] px-4 py-2 font-bold text-[#6b4e3d]"
          >
            סיכום
          </button>
        )}
        {onExit && (
          <button
            onClick={() => leave(onExit)}
            className="planner-secondary-action rounded-xl border border-stone-300 px-4 py-2 font-bold text-stone-600"
          >
            חזרה לדירה שלי
          </button>
        )}
      </div>
      <button
        type="button"
        ref={menuRef}
        className="planner-menu-toggle"
        aria-expanded={actionsOpen}
        aria-controls="planner-header-actions"
        onClick={() => setActionsOpen(!actionsOpen)}
      >
        פעולות
      </button>
      <div className="planner-view-controls flex w-full items-center justify-between gap-3 border-t border-stone-200 pt-2">
        <div
          className="overflow-x-auto rounded-xl bg-stone-100 p-1 whitespace-nowrap"
          role="group"
          aria-label="מצב תצוגה"
        >
          {apartment.id === TIFERET_5_1.id && (
            <button
              type="button"
              aria-pressed={view === 'overlay'}
              onClick={() => {
                setView('overlay');
                setMobilePanel(null);
              }}
              className={`rounded-lg px-3 py-2 text-sm ${view === 'overlay' ? 'bg-white shadow' : ''}`}
            >
              בדיקת חפיפה
            </button>
          )}
          <button
            type="button"
            aria-pressed={view === 'clean'}
            onClick={() => setView('clean')}
            className={`rounded-lg px-3 py-2 text-sm ${view === 'clean' ? 'bg-white shadow' : ''}`}
          >
            תצוגה נקייה
          </button>
          {apartment.id === TIFERET_5_1.id && (
            <button
              type="button"
              aria-pressed={view === 'full'}
              onClick={() => {
                setView('full');
                setMobilePanel(null);
              }}
              className={`rounded-lg px-3 py-2 text-sm ${view === 'full' ? 'bg-white shadow' : ''}`}
            >
              תצוגה מלאה
            </button>
          )}
          <button
            type="button"
            aria-pressed={view === '3d'}
            onClick={() => setView('3d')}
            className={`rounded-lg px-3 py-2 text-sm ${view === '3d' ? 'bg-white shadow' : ''}`}
          >
            הדמיית 3D
          </button>
        </div>
        <div
          className="flex shrink-0 rounded-xl border border-stone-200 bg-white p-1"
          role="group"
          aria-label="היסטוריית שינויים"
        >
          <button
            type="button"
            aria-label="בטל שינוי"
            title="בטל שינוי"
            disabled={historyRef.current.past.length === 0}
            onClick={undo}
            className="rounded-lg px-3 py-2 font-bold text-stone-700 hover:bg-stone-100 disabled:text-stone-300"
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="בצע שוב"
            title="בצע שוב"
            disabled={historyRef.current.future.length === 0}
            onClick={redo}
            className="rounded-lg px-3 py-2 font-bold text-stone-700 hover:bg-stone-100 disabled:text-stone-300"
          >
            ↷
          </button>
        </div>
      </div>
    </header>
  );
}
