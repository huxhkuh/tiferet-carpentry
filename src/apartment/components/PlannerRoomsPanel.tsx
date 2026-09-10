import { createDefaultVisibility, sceneCategoryForFurniture, toggleSceneCategory } from '../planner/design-state';

import { SceneLayersPanel } from '../components/SceneLayersPanel';

import type { PlannerController } from '../planner/use-planner-controller';
export function PlannerRoomsPanel({ controller }: { controller: PlannerController }) {
  const {
    view,
    apartment,
    roomId,
    setRoomId,
    setWallId,
    setPlacements,
    setAddedFurniture,
    setFurnitureOverrides,
    visibility,
    setVisibility,
    furniturePalette,
    setFurniturePalette,
    setCameraByRoom,
    setShowFurnitureCatalog,
    cleanPlanLayers,
    setCleanPlanLayers,
    setActivePlacementId,
    setActiveFurnitureId,
    setNotice,
    setEditError,
    showFurniture,
    selectedRoom,
    activeFurniture,
    savedLabel,
    addedFurnitureLabel,
    recordHistory,
    toggleAllFurniture,
  } = controller;
  return (
    <aside
      className={`${view === 'full' || view === 'overlay' ? 'hidden' : ''} order-3 min-w-0 border-e border-stone-200 bg-white p-4 lg:order-1 lg:p-5`}
      data-testid="planner-room-panel"
    >
      <p className="text-xs font-bold tracking-widest text-[#7b4f35]">חדרים בדירה</p>
      <h2 className="mt-2 text-2xl font-semibold">בחרו חדר</h2>
      {roomId && (
        <button
          type="button"
          onClick={() => {
            setRoomId(null);
            setWallId(null);
            setActivePlacementId(null);
            setActiveFurnitureId(null);
          }}
          className="mt-3 text-sm font-semibold text-[#75472e] underline underline-offset-4"
        >
          הצג את כל הדירה
        </button>
      )}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible">
        {apartment.rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            data-testid={`room-select-${room.id}`}
            onClick={() => {
              setRoomId(room.id);
              setWallId(null);
              setActivePlacementId(null);
              setActiveFurnitureId(null);
            }}
            className={`w-auto shrink-0 rounded-xl px-4 py-3 text-start whitespace-nowrap lg:w-full ${room.id === roomId ? 'bg-[#efe4d6] font-bold text-[#75472e]' : 'hover:bg-stone-100'}`}
          >
            {room.name}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-stone-800">ריהוט והלבשה</p>
            <p className="text-xs leading-5 text-stone-500">מיטות, סלון, מטבח וחדרי רחצה</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="הצג ריהוט מלא"
            aria-checked={showFurniture}
            onClick={toggleAllFurniture}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${showFurniture ? 'bg-[#7b4f35]' : 'bg-stone-300'}`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${showFurniture ? 'start-6' : 'start-1'}`}
            />
          </button>
        </div>
        <button
          type="button"
          disabled={!selectedRoom}
          onClick={() => setShowFurnitureCatalog(true)}
          className="mt-4 w-full rounded-xl bg-[#7b4f35] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          הוסף ריהוט
        </button>
        <div className="mt-4" role="group" aria-label="ערכת צבעים לריהוט">
          <p className="mb-2 text-xs font-semibold text-stone-600">אווירת צבע</p>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ['warm', 'חם'],
                ['light', 'בהיר'],
                ['sage', 'מרווה'],
              ] as const
            ).map(([palette, label]) => (
              <button
                key={palette}
                type="button"
                aria-pressed={furniturePalette === palette}
                onClick={() => {
                  if (furniturePalette === palette) return;
                  recordHistory();
                  setFurniturePalette(palette);
                }}
                className={`rounded-lg px-2 py-2 text-xs font-bold ${furniturePalette === palette ? 'bg-stone-800 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <SceneLayersPanel
          visibility={visibility}
          onToggleCategory={(category) => {
            recordHistory();
            setVisibility((current) => toggleSceneCategory(current, category));
            if (activeFurniture && sceneCategoryForFurniture(activeFurniture.kind) === category) {
              setActiveFurnitureId(null);
            }
          }}
          onShowAll={() => {
            recordHistory();
            setVisibility((current) => ({ ...current, ...createDefaultVisibility() }));
            setNotice('כל שכבות התכנון מוצגות');
          }}
        />
      </div>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="font-bold text-stone-800">שכבות שרטוט</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">הציגו רק את המידע הדרוש בלי לשנות את מידות התוכנית.</p>
        <div className="mt-3 space-y-2">
          {(
            [
              ['doorSwings', 'הצג קשתות דלת'],
              ['dimensions', 'הצג מידות'],
              ['labels', 'הצג שמות חדרים'],
            ] as const
          ).map(([layer, label]) => (
            <div key={layer} className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-stone-700">{label}</span>
              <button
                type="button"
                role="switch"
                aria-label={label}
                aria-checked={cleanPlanLayers[layer]}
                onClick={() => setCleanPlanLayers((current) => ({ ...current, [layer]: !current[layer] }))}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${cleanPlanLayers[layer] ? 'bg-[#7b4f35]' : 'bg-stone-300'}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${cleanPlanLayers[layer] ? 'start-6' : 'start-1'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 border-t pt-5 text-sm text-stone-500">
        <p>{savedLabel} בתכנון</p>
        <p className="mt-1">{addedFurnitureLabel}</p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`לאפס את תכנון ${apartment.name} במכשיר הזה?`)) return;
            recordHistory();
            setPlacements([]);
            setAddedFurniture([]);
            setFurnitureOverrides([]);
            setVisibility(createDefaultVisibility());
            setFurniturePalette('warm');
            setCameraByRoom({});
            setActivePlacementId(null);
            setActiveFurnitureId(null);
            setShowFurnitureCatalog(false);
            setNotice('הטיוטה אופסה; הגרסאות השמורות נשארו זמינות');
            setEditError('');
            setNotice('התכנון אופס');
          }}
          className="mt-3 text-red-700 underline"
        >
          אפס תכנון
        </button>
      </div>
    </aside>
  );
}
