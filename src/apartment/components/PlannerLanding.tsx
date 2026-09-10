import { TIFERET_PROJECT } from '../data/tiferet';

import { ApartmentThumbnail } from '../components/ApartmentThumbnail';

import { apartmentSourceLabel } from '../source/display';
import { BrandMark } from '../../site/components/BrandMark';

import type { PlannerController } from '../planner/use-planner-controller';
export function PlannerLanding({ controller }: { controller: PlannerController }) {
  const {
    SOURCE_INVENTORY_SUMMARY,
    UNRESOLVED_APARTMENT_SOURCE_COUNT,
    setStarted,
    setBuildingId,
    building,
    setFloorNumber,
    floor,
    apartment,
    activateApartment,
    leave,
    onExit,
  } = controller;
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-stone-800" dir="rtl">
      <header className="flex items-center justify-between border-b border-stone-300 px-6 py-4 md:px-16">
        <div className="flex items-center gap-3">
          <BrandMark compact />
          <div>
            <strong className="block text-xl tracking-wide text-[#5f402f]">נגרות תפארת</strong>
            <small className="text-xs text-stone-500">סטודיו לתכנון מותאם</small>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-stone-600 sm:inline">מתכננים בית. יוצרים בדיוק.</span>
          {onExit && (
            <button
              type="button"
              onClick={() => leave(onExit)}
              className="text-sm font-semibold text-stone-600 underline"
            >
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
                    {apartmentSourceLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 grid gap-2 rounded-2xl border border-stone-300 bg-white/70 p-4 text-sm text-stone-700 sm:grid-cols-3">
            <p>
              <span className="font-bold text-stone-900">
                {SOURCE_INVENTORY_SUMMARY.totalSourcePdfs} קבצי PDF נסרקו מהמקור
              </span>
            </p>
            <p>
              <span className="font-bold text-stone-900">
                {UNRESOLVED_APARTMENT_SOURCE_COUNT} תוכניות דירה טרם שוחזרו לגאומטריה אדריכלית
              </span>
            </p>
            <p>
              <span className="font-bold text-stone-900">
                {apartmentSourceLabel(apartment)} זמינה כמודל עבודה; האימות האדריכלי המלא עדיין בהמתנה
              </span>
            </p>
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
            {apartmentSourceLabel(apartment)} • {building?.name}
          </span>
        </div>
      </section>
    </main>
  );
}
