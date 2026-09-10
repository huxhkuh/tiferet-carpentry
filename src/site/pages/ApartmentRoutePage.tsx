import { lazy, Suspense, useState } from 'react';
import { resolveApartment } from '../../apartment/data/apartment-registry';
import { ErrorBoundary } from '../../components/layout/ErrorBoundary';
import type { SiteRoute } from '../router';
import type { NavigateSite } from '../types';

const PlannerApp = lazy(() => import('../../apartment/PlannerApp').then((module) => ({ default: module.PlannerApp })));
const MyApartmentPage = lazy(() => import('./MyApartmentPage').then((module) => ({ default: module.MyApartmentPage })));
const SummaryPage = lazy(() => import('./SummaryPage').then((module) => ({ default: module.SummaryPage })));
const NotFoundPage = lazy(() => import('./NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

/** Load stored apartment geometry only for routes that use it. */
export function ApartmentRoutePage({ route, navigate }: { route: SiteRoute; navigate: NavigateSite }) {
  const [importRevision, setImportRevision] = useState(0);
  if (route.id === 'design') {
    const importedApartment = resolveApartment(route.apartmentId);
    if (route.apartmentId && importedApartment === undefined) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#f5f1e9] p-6 text-center" dir="rtl">
          <div>
            <h1 className="text-3xl font-semibold text-stone-900">הדירה המיובאת לא נמצאה במכשיר הזה</h1>
            <p className="mt-3 text-stone-600">המודלים נשמרים מקומית בדפדפן שבו בוצע הייבוא.</p>
            <button
              type="button"
              onClick={() => navigate({ id: 'import' })}
              className="mt-6 rounded-xl bg-[#6f4935] px-6 py-3 font-bold text-white"
            >
              ייבוא תוכנית
            </button>
          </div>
        </main>
      );
    }
    return (
      <ErrorBoundary
        key={`${route.apartmentId ?? 'default'}:${route.designId ?? 'draft'}:${importRevision}`}
        panelName="מתכנן הדירה"
      >
        <Suspense fallback={<main aria-busy="true">טוען את מתכנן הנגרות…</main>}>
          <PlannerApp
            initialStarted
            initialRoomId={route.roomId}
            initialApartment={importedApartment}
            initialDesignId={route.designId}
            onRoomChange={(roomId) => navigate({ ...route, roomId })}
            onDesignChange={(designId) => navigate({ ...route, designId })}
            onApartmentChange={(apartmentId) => {
              setImportRevision((revision) => revision + 1);
              navigate({ id: 'design', apartmentId, roomId: resolveApartment(apartmentId)?.rooms[0]?.id ?? 'bedroom' });
            }}
            onExit={() => navigate({ id: 'my-apartment', apartmentId: importedApartment?.id })}
            onSummary={() => navigate({ id: 'summary', apartmentId: importedApartment?.id })}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  const apartment = resolveApartment(route.apartmentId);
  if (!apartment) return <NotFoundPage navigate={navigate} />;
  return route.id === 'summary' ? (
    <SummaryPage navigate={navigate} apartment={apartment} />
  ) : (
    <MyApartmentPage navigate={navigate} apartment={apartment} />
  );
}
