import { useEffect, useMemo, useState } from 'react';
import { MATERIALS } from '../engine/materials';
import type { CabinetConfig, DoorStyle, FurnitureType, HandleStyle } from '../engine/types';
import type { Apartment, CabinetPlacement, FurniturePalette, SavedDesign } from './types';
import { TIFERET_5_1, TIFERET_PROJECT } from './data/tiferet';
import { createCabinetPlacement, deriveCabinet, updateCabinetPlacement } from './cabinet/adapter';
import { validatePlacement, wallLength } from './geometry/placement';
import { restoreDesign, saveDesign } from './persistence/design';
import { ApartmentThumbnail } from './components/ApartmentThumbnail';
import { FullSourcePlan } from './components/FullSourcePlan';
import { Plan2D } from './components/Plan2D';
import { Room3D } from './components/Room3D';

const LEGACY_STORAGE_KEY = 'tiferet:design:5-1';
const DEFAULT_BUILDING = TIFERET_PROJECT.buildings[0];
const DEFAULT_FLOOR = DEFAULT_BUILDING?.floors[0];
const DEFAULT_APARTMENT = DEFAULT_FLOOR?.apartments[0] ?? TIFERET_5_1;
const PANEL_MATERIALS = MATERIALS.filter((material) => material.category === 'panel').slice(0, 12);
type NumericField = 'width' | 'height' | 'depth' | 'shelfCount' | 'drawerCount' | 'doorCount' | 'distanceFromWallStart';
let placementSequence = 0;

function designStorageKey(apartmentId: string): string {
  return apartmentId === TIFERET_5_1.id ? LEGACY_STORAGE_KEY : `tiferet:design:${apartmentId}`;
}

function loadSavedPlacements(apartmentId: string): CabinetPlacement[] {
  if (typeof localStorage === 'undefined') return [];
  return restoreDesign(localStorage, designStorageKey(apartmentId), apartmentId)?.placements ?? [];
}

function createPlacementId(): string {
  placementSequence += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `tiferet-placement-${placementSequence}`;
}

export function PlannerApp({
  onExit,
  initialStarted = false,
  initialRoomId = null,
  onSummary,
}: {
  onExit?: () => void;
  initialStarted?: boolean;
  initialRoomId?: string | null;
  onSummary?: () => void;
}) {
  const [started, setStarted] = useState(initialStarted);
  const [view, setView] = useState<'clean' | 'full' | '3d'>('clean');
  const [showFurniture, setShowFurniture] = useState(true);
  const [furniturePalette, setFurniturePalette] = useState<FurniturePalette>('warm');
  const [buildingId, setBuildingId] = useState(DEFAULT_BUILDING?.id ?? '');
  const building = TIFERET_PROJECT.buildings.find((item) => item.id === buildingId) ?? DEFAULT_BUILDING;
  const [floorNumber, setFloorNumber] = useState(DEFAULT_FLOOR?.number ?? 0);
  const floor = building?.floors.find((item) => item.number === floorNumber) ?? building?.floors[0];
  const [apartmentId, setApartmentId] = useState(DEFAULT_APARTMENT.id);
  const apartment =
    floor?.apartments.find((item) => item.id === apartmentId) ?? floor?.apartments[0] ?? DEFAULT_APARTMENT;
  const [roomId, setRoomId] = useState<string | null>(() =>
    DEFAULT_APARTMENT.rooms.some((room) => room.id === initialRoomId) ? initialRoomId : null,
  );
  const [wallId, setWallId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<CabinetPlacement[]>(() => loadSavedPlacements(apartment.id));
  const [activePlacementId, setActivePlacementId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [editError, setEditError] = useState('');
  const selectedWall = apartment.walls.find((wall) => wall.id === wallId);
  const selectedRoom = apartment.rooms.find((room) => room.id === roomId);
  const active = placements.find((placement) => placement.id === activePlacementId);
  const activeWall = active ? apartment.walls.find((wall) => wall.id === active.wallId) : undefined;
  const activeRoom = active ? apartment.rooms.find((room) => room.id === active.roomId) : undefined;
  const activeDerivation = useMemo(() => (active ? deriveCabinet(active.cabinetConfig) : null), [active]);
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';
  }, []);
  const savedLabel = useMemo(
    () => (placements.length === 1 ? 'ארון אחד' : `${placements.length} ארונות`),
    [placements.length],
  );
  const activateApartment = (nextApartment: Apartment) => {
    setApartmentId(nextApartment.id);
    setPlacements(loadSavedPlacements(nextApartment.id));
    setRoomId(null);
    setWallId(null);
    setActivePlacementId(null);
    setEditError('');
    setNotice('');
  };
  const addCabinet = () => {
    if (!selectedWall) return;
    const roomForPlacement = selectedRoom ?? apartment.rooms.find((room) => room.wallIds.includes(selectedWall.id));
    if (!roomForPlacement) {
      setEditError('בחרו חדר וקיר לפני הוספת ארון');
      return;
    }
    let placement: CabinetPlacement;
    try {
      placement = createCabinetPlacement({
        apartment,
        room: roomForPlacement,
        wall: selectedWall,
        cabinetConfig: { width: 1800, height: 2400, depth: 600 },
        existingPlacements: placements,
        id: createPlacementId(),
      });
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן למקם ארון בקיר הזה');
      return;
    }
    setPlacements((items) => [...items, placement]);
    setActivePlacementId(placement.id);
    setEditError('');
    setNotice('הארון נוסף לקיר ונבחר לעריכה');
  };
  const deleteActivePlacement = () => {
    if (!active) return;
    setPlacements((items) => items.filter((item) => item.id !== active.id));
    setActivePlacementId(null);
    setNotice('הארון הוסר מהתכנון המקומי');
  };
  const updatePlacement = (configPatch: Partial<CabinetConfig>, distanceFromWallStart?: number) => {
    if (!active || !activeWall || !activeRoom) return;
    try {
      let nextPlacement = updateCabinetPlacement(active, configPatch, activeWall, activeRoom, placements);
      if (distanceFromWallStart !== undefined) {
        const placementError = validatePlacement(
          activeWall,
          nextPlacement.width,
          distanceFromWallStart,
          placements,
          active.id,
        );
        if (placementError) throw new RangeError(placementError);
        nextPlacement = { ...nextPlacement, distanceFromWallStart };
      }
      setPlacements((items) => items.map((item) => (item.id === active.id ? nextPlacement : item)));
      setEditError('');
      setNotice('השינוי עודכן בתכנית');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן לעדכן את הארון');
    }
  };
  const updateNumber = (key: NumericField, value: number) => {
    if (!active) return;
    if (key === 'distanceFromWallStart') {
      updatePlacement({}, value);
      return;
    }
    if (key === 'doorCount') {
      updatePlacement({ doorCount: value === 1 ? 1 : 2 });
      return;
    }
    if (key === 'drawerCount') {
      updatePlacement({ drawerCount: Math.max(0, Math.round(value)) });
      return;
    }
    if (key === 'shelfCount') {
      updatePlacement({ shelfCount: Math.max(0, Math.round(value)) });
      return;
    }
    if (key === 'width') {
      updatePlacement({ width: value });
      return;
    }
    if (key === 'height') {
      updatePlacement({ height: value });
      return;
    }
    updatePlacement({ depth: value });
  };
  const updateSelect = (
    key: 'furnitureType' | 'doorStyle' | 'handleStyle' | 'carcassMaterial',
    value: FurnitureType | DoorStyle | HandleStyle | string,
  ) => {
    if (!active) return;
    updatePlacement({ [key]: value });
  };
  const save = () => {
    const invalid = placements
      .map((placement) => {
        const wall = apartment.walls.find((item) => item.id === placement.wallId);
        return wall
          ? validatePlacement(wall, placement.width, placement.distanceFromWallStart, placements, placement.id)
          : 'קיר ההצבה אינו קיים בדירה';
      })
      .find((error) => error !== null);
    if (invalid) {
      setEditError(invalid);
      return;
    }
    const design: SavedDesign = {
      schemaVersion: 1,
      id: 'design-5-1',
      apartmentId: apartment.id,
      name: 'תכנון דירה 5-1',
      updatedAt: new Date().toISOString(),
      placements,
    };
    saveDesign(localStorage, designStorageKey(apartment.id), design);
    setEditError('');
    setNotice('התכנון נשמר בהצלחה במכשיר זה');
  };
  if (!started)
    return (
      <main className="min-h-screen bg-[#f4f0e8] text-stone-800" dir="rtl">
        <header className="flex items-center justify-between px-6 py-5 md:px-16">
          <strong className="text-xl tracking-wide text-[#5f402f]">נגרות תפארת</strong>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-stone-600 sm:inline">מתכננים בית. יוצרים בדיוק.</span>
            {onExit && (
              <button type="button" onClick={onExit} className="text-sm font-semibold text-stone-600 underline">
                חזרה לאתר
              </button>
            )}
          </div>
        </header>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-3 text-sm font-bold tracking-widest text-[#7b4f35]">פרויקט מגורים • רמלה</p>
            <h1 className="text-5xl leading-tight font-semibold md:text-7xl">{TIFERET_PROJECT.name}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
              תכננו את הנגרות בדירה החדשה, בקנה מידה ובחוויה חזותית פשוטה.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="text-sm text-stone-600">
                <label htmlFor="tiferet-building" className="block">
                  מתחם / בניין
                </label>
                <select
                  id="tiferet-building"
                  value={building?.id ?? ''}
                  onChange={(event) => {
                    const nextBuilding = TIFERET_PROJECT.buildings.find((item) => item.id === event.target.value);
                    const nextFloor = nextBuilding?.floors[0];
                    const nextApartment = nextFloor?.apartments[0];
                    if (!nextBuilding || !nextFloor || !nextApartment) return;
                    setBuildingId(nextBuilding.id);
                    setFloorNumber(nextFloor.number);
                    activateApartment(nextApartment);
                  }}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800"
                >
                  {TIFERET_PROJECT.buildings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-stone-600">
                <label htmlFor="tiferet-floor" className="block">
                  קומה
                </label>
                <select
                  id="tiferet-floor"
                  value={String(floor?.number ?? '')}
                  onChange={(event) => {
                    const nextFloor = building?.floors.find((item) => item.number === Number(event.target.value));
                    const nextApartment = nextFloor?.apartments[0];
                    if (!nextFloor || !nextApartment) return;
                    setFloorNumber(nextFloor.number);
                    activateApartment(nextApartment);
                  }}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800"
                >
                  {building?.floors.map((item) => (
                    <option key={item.id} value={item.number}>
                      קומה {item.number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-stone-600">
                <label htmlFor="tiferet-apartment" className="block">
                  דירה
                </label>
                <select
                  id="tiferet-apartment"
                  value={apartment.id}
                  onChange={(event) => {
                    const nextApartment = floor?.apartments.find((item) => item.id === event.target.value);
                    if (nextApartment) activateApartment(nextApartment);
                  }}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800"
                >
                  {floor?.apartments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="mt-8 rounded-xl bg-[#7b4f35] px-9 py-4 text-lg font-bold text-white shadow-lg hover:bg-[#653e28]"
            >
              התחל לתכנן ←
            </button>
          </div>
          <div className="relative hidden aspect-square rounded-[3rem] bg-[#d9c8ac] p-8 shadow-2xl md:block">
            <div className="h-full overflow-hidden rounded-[2rem] border-[14px] border-white/80 bg-[#eee6d7] p-4">
              <ApartmentThumbnail apartment={apartment} />
            </div>
            <span className="absolute right-10 bottom-8 rounded-full bg-white px-5 py-3 text-sm shadow">
              {apartment.name} • {building?.name}
            </span>
          </div>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#eeeae2] text-stone-800" dir="rtl">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8 md:py-4">
        <div>
          <strong className="text-lg text-[#5f402f]">נגרות תפארת</strong>
          <p className="text-xs text-stone-500">
            {building?.name} • קומה {floor?.number} • {apartment.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              aria-pressed={view === 'clean'}
              onClick={() => setView('clean')}
              className={`rounded-lg px-4 py-2 ${view === 'clean' ? 'bg-white shadow' : ''}`}
            >
              תצוגה נקייה
            </button>
            <button
              type="button"
              aria-pressed={view === 'full'}
              onClick={() => setView('full')}
              className={`rounded-lg px-4 py-2 ${view === 'full' ? 'bg-white shadow' : ''}`}
            >
              תצוגה מלאה
            </button>
            <button
              type="button"
              aria-pressed={view === '3d'}
              onClick={() => setView('3d')}
              className={`rounded-lg px-4 py-2 ${view === '3d' ? 'bg-white shadow' : ''}`}
            >
              הדמיית 3D
            </button>
          </div>
          <button onClick={save} className="rounded-xl bg-[#7b4f35] px-5 py-2 font-bold text-white">
            שמור תכנון
          </button>
          {onSummary && (
            <button
              onClick={onSummary}
              className="rounded-xl border border-[#7b4f35] px-4 py-2 font-bold text-[#6b4e3d]"
            >
              סיכום
            </button>
          )}
          {onExit && (
            <button onClick={onExit} className="rounded-xl border border-stone-300 px-4 py-2 font-bold text-stone-600">
              חזרה לדירה שלי
            </button>
          )}
        </div>
      </header>
      <div
        className={`grid min-h-[calc(100vh-8rem)] ${view === 'full' ? 'lg:grid-cols-1' : 'lg:grid-cols-[16rem_minmax(0,1fr)_19rem]'}`}
      >
        <aside
          className={`${view === 'full' ? 'hidden' : ''} order-2 min-w-0 border-e border-stone-200 bg-white p-4 lg:order-1 lg:p-5`}
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
                onClick={() => setShowFurniture((current) => !current)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${showFurniture ? 'bg-[#7b4f35]' : 'bg-stone-300'}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${showFurniture ? 'start-6' : 'start-1'}`}
                />
              </button>
            </div>
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
                    onClick={() => setFurniturePalette(palette)}
                    className={`rounded-lg px-2 py-2 text-xs font-bold ${furniturePalette === palette ? 'bg-stone-800 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-5 text-sm text-stone-500">
            <p>{savedLabel} בתכנון</p>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('לאפס את תכנון דירה 5-1 במכשיר הזה?')) return;
                setPlacements([]);
                setActivePlacementId(null);
                localStorage.removeItem(designStorageKey(apartment.id));
                setEditError('');
                setNotice('התכנון אופס');
              }}
              className="mt-3 text-red-700 underline"
            >
              אפס תכנון
            </button>
          </div>
        </aside>
        <section
          data-testid="planner-canvas"
          className={`order-1 min-h-96 min-w-0 p-3 sm:p-4 lg:sticky lg:top-20 lg:order-2 lg:h-[calc(100vh-5rem)] lg:min-h-[32rem] lg:self-start ${view === 'full' ? 'lg:p-4' : 'lg:p-7'}`}
        >
          {view === 'clean' ? (
            <Plan2D
              apartment={apartment}
              placements={placements}
              roomId={roomId}
              wallId={wallId}
              activePlacementId={active?.id ?? null}
              showFurniture={showFurniture}
              furniturePalette={furniturePalette}
              onRoom={(id) => {
                setRoomId(id);
                setWallId(null);
                setActivePlacementId(null);
              }}
              onWall={(id) => {
                const room = apartment.rooms.find((item) => item.wallIds.includes(id));
                setRoomId(room?.id ?? null);
                setWallId(id);
                setActivePlacementId(
                  [...placements].reverse().find((placement) => placement.wallId === id)?.id ?? null,
                );
              }}
              onPlacement={(id) => {
                const placement = placements.find((item) => item.id === id);
                setActivePlacementId(id);
                setRoomId(placement?.roomId ?? null);
                setWallId(placement?.wallId ?? null);
              }}
            />
          ) : view === 'full' ? (
            <FullSourcePlan />
          ) : (
            <Room3D
              apartment={apartment}
              roomId={roomId}
              placements={placements}
              showFurniture={showFurniture}
              furniturePalette={furniturePalette}
            />
          )}
        </section>
        <aside
          className={`${view === 'full' ? 'hidden' : ''} order-3 min-w-0 border-s border-stone-200 bg-white p-4 lg:p-5`}
        >
          <p className="text-xs font-bold tracking-widest text-[#7b4f35]">{selectedRoom?.name ?? 'פרטי תכנון'}</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {selectedWall ? `הקיר הנבחר: ${Math.round(wallLength(selectedWall) / 10)} ס״מ` : 'בחרו קיר בתכנית'}
          </h2>
          {selectedRoom && (
            <div className="mt-4 grid grid-cols-2 gap-2" aria-label={`קירות ${selectedRoom.name}`}>
              {selectedRoom.wallIds.map((candidateWallId, index) => {
                const candidateWall = apartment.walls.find((wall) => wall.id === candidateWallId);
                if (!candidateWall) return null;
                return (
                  <button
                    key={candidateWall.id}
                    type="button"
                    data-testid={`wall-list-${candidateWall.id}`}
                    onClick={() => {
                      setWallId(candidateWall.id);
                      setActivePlacementId(
                        [...placements].reverse().find((placement) => placement.wallId === candidateWall.id)?.id ??
                          null,
                      );
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${candidateWall.id === wallId ? 'border-[#a86640] bg-[#f4e7da] text-[#75472e]' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                  >
                    קיר {index + 1} · {Math.round(wallLength(candidateWall) / 10)} ס״מ
                  </button>
                );
              })}
            </div>
          )}
          {selectedWall && !active && (
            <button
              type="button"
              onClick={addCabinet}
              className="mt-6 w-full rounded-xl bg-[#7b4f35] py-4 font-bold text-white"
            >
              ＋ הוסף ארון
            </button>
          )}
          {selectedWall && active && (
            <button
              type="button"
              onClick={addCabinet}
              className="mt-6 w-full rounded-xl bg-[#7b4f35] py-3 font-bold text-white"
            >
              ＋ הוסף ארון לקיר הנבחר
            </button>
          )}
          {active && (
            <div className="mt-6 space-y-4">
              <h3 className="font-bold">הגדרת הארון</h3>
              {activeDerivation && (
                <p className="text-sm text-stone-500">
                  מחושב במנוע הנגרות המקצועי • {activeDerivation.parts.length} חלקי ייצור
                </p>
              )}
              <button
                type="button"
                onClick={deleteActivePlacement}
                className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
              >
                מחק ארון נבחר
              </button>
              <label className="block text-sm">
                סוג נגרות
                <select
                  value={active.cabinetConfig.furnitureType}
                  onChange={(event) => updateSelect('furnitureType', event.target.value as FurnitureType)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="wardrobe">ארון קיר</option>
                  <option value="cabinet">ארון כללי</option>
                  <option value="bookshelf">ספרייה</option>
                </select>
              </label>
              {(
                [
                  ['width', 'רוחב', 60, 300],
                  ['height', 'גובה', 180, 280],
                  ['depth', 'עומק', 35, 80],
                  ['distanceFromWallStart', 'מרחק מתחילת הקיר', 0, 300],
                  ['shelfCount', 'מדפים', 0, 12],
                  ['drawerCount', 'מגירות', 0, 6],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key} className="block text-sm text-stone-600">
                  {label} {['width', 'height', 'depth', 'distanceFromWallStart'].includes(key) ? '(ס״מ)' : ''}
                  <input
                    aria-label={label}
                    type="number"
                    min={min}
                    max={max}
                    value={
                      key === 'distanceFromWallStart'
                        ? active.distanceFromWallStart / 10
                        : ['width', 'height', 'depth'].includes(key)
                          ? active.cabinetConfig[key] / 10
                          : active.cabinetConfig[key]
                    }
                    onChange={(event) =>
                      updateNumber(
                        key,
                        ['width', 'height', 'depth', 'distanceFromWallStart'].includes(key)
                          ? Number(event.target.value) * 10
                          : Number(event.target.value),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-lg"
                  />
                </label>
              ))}
              <label className="block text-sm">
                מספר דלתות
                <select
                  value={active.cabinetConfig.doorCount}
                  onChange={(event) => updateNumber('doorCount', Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="1">דלת אחת</option>
                  <option value="2">שתי דלתות</option>
                </select>
              </label>
              <label className="block text-sm">
                סגנון דלת
                <select
                  value={active.cabinetConfig.doorStyle}
                  onChange={(event) => updateSelect('doorStyle', event.target.value as DoorStyle)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="flat">חלק</option>
                  <option value="shaker">מסגרת</option>
                  <option value="glass">זכוכית</option>
                  <option value="none">פתוח</option>
                </select>
              </label>
              <label className="block text-sm">
                ידיות
                <select
                  value={active.cabinetConfig.handleStyle}
                  onChange={(event) => updateSelect('handleStyle', event.target.value as HandleStyle)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="bar">ידית בר</option>
                  <option value="knob">כפתור</option>
                  <option value="cup">שקע</option>
                  <option value="none">ללא</option>
                </select>
              </label>
              <label className="block text-sm">
                גמר
                <select
                  value={active.cabinetConfig.carcassMaterial}
                  onChange={(event) => updateSelect('carcassMaterial', event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  {PANEL_MATERIALS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name.he}
                    </option>
                  ))}
                </select>
              </label>
              <div role="group" aria-label="בחירת צבע וגמר לארון">
                <p className="mb-2 text-sm text-stone-600">בחירת צבע חזותית</p>
                <div className="flex flex-wrap gap-2">
                  {PANEL_MATERIALS.map((material) => (
                    <button
                      key={material.key}
                      type="button"
                      aria-label={`בחר גמר ${material.name.he}`}
                      aria-pressed={active.cabinetConfig.carcassMaterial === material.key}
                      title={material.name.he}
                      onClick={() => updateSelect('carcassMaterial', material.key)}
                      className={`h-9 w-9 rounded-full border-2 shadow-sm transition hover:scale-105 ${active.cabinetConfig.carcassMaterial === material.key ? 'border-stone-900 ring-2 ring-amber-600 ring-offset-2' : 'border-white'}`}
                      style={{ backgroundColor: material.color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {editError && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
              {editError}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
        </aside>
      </div>
      <footer className="border-t bg-[#39332e] px-6 py-3 text-center text-xs text-stone-200">
        המידות והתכנון באתר מיועדים להמחשה ולתכנון ראשוני בלבד. לפני ייצור והזמנת נגרות יש לבצע מדידה מקצועית בדירה
        בפועל.
      </footer>
    </main>
  );
}
