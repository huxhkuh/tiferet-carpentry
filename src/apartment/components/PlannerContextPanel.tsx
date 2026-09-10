import { cabinetUsageWarnings } from '../geometry/usage-clearance';

import type { DoorStyle, FurnitureType, HandleStyle } from '../../engine/types';

import { wallLength } from '../geometry/placement';

import { resizeFurniture, snapFurnitureToGrid, snapFurnitureToNearestWall } from '../furniture/transform';

import { toggleObjectVisibility } from '../planner/design-state';

import { FurnitureEditor } from '../components/FurnitureEditor';

import type { PlannerController } from '../planner/use-planner-controller';
export function PlannerContextPanel({ controller }: { controller: PlannerController }) {
  const {
    PANEL_MATERIALS,
    view,
    apartment,
    wallId,
    setWallId,
    placements,
    addedFurniture,
    setVisibility,
    setActivePlacementId,
    setActiveFurnitureId,
    notice,
    setNotice,
    editError,
    furniture,
    selectedWall,
    selectedRoom,
    active,
    activeFurniture,
    activeDerivation,
    recordHistory,
    isObjectLocked,
    toggleObjectLock,
    duplicateFurniture,
    deleteFurniture,
    addCabinet,
    deleteActivePlacement,
    commitFurnitureUpdate,
    updateFurniture,
    updateNumber,
    updateSelect,
  } = controller;
  const selectedObjectId = activeFurniture?.id ?? active?.id;
  const locked = selectedObjectId ? isObjectLocked(selectedObjectId) : false;
  return (
    <aside
      className={`${view === 'full' || view === 'overlay' ? 'hidden' : ''} order-2 min-w-0 border-s border-stone-200 bg-white p-4 lg:order-3 lg:p-5`}
      data-testid="planner-context-panel"
    >
      <p className="text-xs font-bold tracking-widest text-[#7b4f35]">
        {activeFurniture ? 'פריט נבחר' : (selectedRoom?.name ?? 'פרטי תכנון')}
      </p>
      <h2 className="mt-2 text-2xl font-semibold">
        {activeFurniture
          ? activeFurniture.label
          : selectedWall
            ? `הקיר הנבחר: ${Math.round(wallLength(selectedWall) / 10)} ס״מ`
            : 'בחרו קיר בתכנית'}
      </h2>
      {selectedObjectId && (
        <button
          type="button"
          aria-pressed={locked}
          onClick={() => toggleObjectLock(selectedObjectId)}
          className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold focus-visible:outline-2"
        >
          {locked ? 'שחרור נעילת הפריט' : 'נעילת הפריט'}
        </button>
      )}
      {active && (
        <ul className="mt-3 space-y-2 text-sm text-amber-800">
          {cabinetUsageWarnings(apartment, active, placements, furniture).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {activeFurniture ? (
        <fieldset disabled={locked} className="mt-5 min-w-0 disabled:opacity-60">
          <legend className="sr-only">עריכת פריט נבחר</legend>
          <FurnitureEditor
            item={activeFurniture}
            onPositionChange={(x, y) => updateFurniture(activeFurniture, x, y, activeFurniture.rotation)}
            onRotationChange={(rotation) =>
              updateFurniture(activeFurniture, activeFurniture.x, activeFurniture.y, rotation)
            }
            onDimensionsChange={(width, depth, height) =>
              commitFurnitureUpdate(activeFurniture, resizeFurniture(activeFurniture, { width, depth, height }))
            }
            onAppearanceChange={(patch) => commitFurnitureUpdate(activeFurniture, { ...activeFurniture, ...patch })}
            onSnapToGrid={() => commitFurnitureUpdate(activeFurniture, snapFurnitureToGrid(activeFurniture, 50))}
            onSnapToWall={() => {
              const room = apartment.rooms.find((candidate) => candidate.id === activeFurniture.roomId);
              if (room) {
                commitFurnitureUpdate(activeFurniture, snapFurnitureToNearestWall(apartment, room, activeFurniture));
              }
            }}
            onHide={() => {
              recordHistory();
              setVisibility((current) => toggleObjectVisibility(current, activeFurniture.id));
              setActiveFurnitureId(null);
              setNotice(`${activeFurniture.label} הוסתר. אפשר לשחזר אותו מפאנל השכבות`);
            }}
            onDuplicate={() => duplicateFurniture(activeFurniture)}
            onDelete={
              addedFurniture.some((item) => item.id === activeFurniture.id)
                ? () => deleteFurniture(activeFurniture)
                : undefined
            }
          />
        </fieldset>
      ) : null}
      {!activeFurniture && selectedRoom && (
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
                  setActiveFurnitureId(null);
                  setActivePlacementId(
                    [...placements].reverse().find((placement) => placement.wallId === candidateWall.id)?.id ?? null,
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
      {!activeFurniture && selectedWall && !active && (
        <button
          type="button"
          onClick={addCabinet}
          className="mt-6 w-full rounded-xl bg-[#7b4f35] py-4 font-bold text-white"
        >
          ＋ הוסף ארון
        </button>
      )}
      {!activeFurniture && selectedWall && active && (
        <button
          type="button"
          onClick={addCabinet}
          className="mt-6 w-full rounded-xl bg-[#7b4f35] py-3 font-bold text-white"
        >
          ＋ הוסף ארון לקיר הנבחר
        </button>
      )}
      {!activeFurniture && active && (
        <fieldset disabled={locked} className="mt-6 min-w-0 space-y-4 disabled:opacity-60">
          <legend className="font-bold">הגדרת הארון</legend>
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
        </fieldset>
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
  );
}
