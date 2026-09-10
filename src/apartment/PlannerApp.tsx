import '../index.css';
import './planner.css';
import { useEffect, useRef, useState } from 'react';

import { FurnitureCatalogPanel } from './components/FurnitureCatalogPanel';

import { DesignLibraryPanel } from './components/DesignLibraryPanel';

import { usePlannerController } from './planner/use-planner-controller';
import { PlannerHeader } from './components/PlannerHeader';
import { PlannerRoomsPanel } from './components/PlannerRoomsPanel';
import { PlannerCanvasPanel } from './components/PlannerCanvasPanel';
import { PlannerContextPanel } from './components/PlannerContextPanel';
import { PlannerLanding } from './components/PlannerLanding';
export function PlannerApp(props: Parameters<typeof usePlannerController>[0]) {
  const controller = usePlannerController(props);
  const workspaceRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      const main = workspaceRef.current;
      if (main)
        main.style.setProperty(
          '--planner-viewport',
          `${Math.max(240, (viewport?.height ?? window.innerHeight) - main.getBoundingClientRect().top)}px`,
        );
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(document.body);
    viewport?.addEventListener('resize', resize);
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      viewport?.removeEventListener('resize', resize);
      window.removeEventListener('resize', resize);
    };
  }, [controller.started]);
  const {
    started,
    view,
    designLibrary,
    designName,
    setDesignName,
    showDesignLibrary,
    setShowDesignLibrary,
    showFurnitureCatalog,
    setShowFurnitureCatalog,
    pdfImportDraft,
    pdfImportState,
    selectedRoom,
    addFurniture,
    saveAsNewVersion,
    loadDesignVersion,
    deleteDesignVersion,
    exportActiveDesign,
    importDesignVersion,
    importArchitecturalPdf,
  } = controller;
  if (!started) return <PlannerLanding controller={controller} />;
  return (
    <main
      ref={workspaceRef}
      className="planner-workspace min-h-screen bg-[#eeeae2] text-stone-800"
      data-mobile-panel={controller.mobilePanel ?? 'none'}
      data-panel-expanded={expanded}
      dir="rtl"
    >
      <PlannerHeader controller={controller} />
      <nav className="planner-mobile-tools" aria-label="כלי תכנון למובייל">
        <button
          type="button"
          aria-expanded={controller.mobilePanel === 'rooms'}
          aria-controls="planner-rooms"
          onClick={() => controller.setMobilePanel(controller.mobilePanel === 'rooms' ? null : 'rooms')}
        >
          חדרים וריהוט
        </button>
        <button
          type="button"
          aria-expanded={controller.mobilePanel === 'inspector'}
          aria-controls="planner-inspector"
          onClick={() => controller.setMobilePanel(controller.mobilePanel === 'inspector' ? null : 'inspector')}
        >
          נגרות ומידות
        </button>
        {controller.mobilePanel && (
          <button type="button" onClick={() => controller.setMobilePanel(null)}>
            הגדלת המודל
          </button>
        )}
      </nav>
      {showDesignLibrary && (
        <DesignLibraryPanel
          library={designLibrary}
          designName={designName}
          errorMessage={controller.editError}
          onNameChange={setDesignName}
          notes={controller.designMetadata.notes}
          onNotesChange={(notes) => controller.setDesignMetadata((metadata) => ({ ...metadata, notes }))}
          onSaveAsNew={saveAsNewVersion}
          onLoad={loadDesignVersion}
          onDelete={deleteDesignVersion}
          onExport={exportActiveDesign}
          onImport={(file) => void importDesignVersion(file)}
          onImportPdf={(file) => void importArchitecturalPdf(file)}
          pdfImportDraft={pdfImportDraft}
          pdfImportState={pdfImportState}
          onClose={() => {
            controller.cancelPdfImport();
            setShowDesignLibrary(false);
          }}
        />
      )}
      {showFurnitureCatalog && selectedRoom && (
        <FurnitureCatalogPanel
          roomName={selectedRoom.name}
          onAdd={addFurniture}
          onClose={() => setShowFurnitureCatalog(false)}
        />
      )}
      <div
        className={`planner-workspace-body grid min-h-[calc(100vh-8rem)] ${view === 'full' || view === 'overlay' ? 'lg:grid-cols-1' : 'lg:grid-cols-[16rem_minmax(0,1fr)_19rem]'}`}
      >
        <div id="planner-rooms" className="planner-panel planner-panel--rooms">
          <div className="planner-panel-controls">
            <strong>חדרים, שכבות וריהוט</strong>
            <button type="button" onClick={() => controller.setMobilePanel(null)} aria-label="סגירת רשימת החדרים">
              סגירה
            </button>
          </div>
          <PlannerRoomsPanel controller={controller} />
        </div>
        <PlannerCanvasPanel controller={controller} />
        <div id="planner-inspector" className="planner-panel planner-panel--inspector">
          <div className="planner-panel-controls">
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? 'הקטנת חלון העריכה' : 'הרחבת חלון העריכה'}
            </button>
            <button type="button" onClick={() => controller.setMobilePanel(null)} aria-label="סגירת עריכת הפריט">
              סגירה
            </button>
          </div>
          <PlannerContextPanel controller={controller} />
        </div>
      </div>
      <footer className="border-t bg-[#39332e] px-6 py-3 text-center text-xs text-stone-200">
        המידות והתכנון באתר מיועדים להמחשה ולתכנון ראשוני בלבד. לפני ייצור והזמנת נגרות יש לבצע מדידה מקצועית בדירה
        בפועל.
      </footer>
    </main>
  );
}
