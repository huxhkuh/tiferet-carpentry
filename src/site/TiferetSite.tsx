import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { HomePage } from './pages/HomePage';
import { parseSiteLocation, sitePath, type SiteRoute } from './router';
import { restoreImportedApartments } from '../apartment/persistence/imported-apartments';
import './site.css';

const PlannerApp = lazy(() => import('../apartment/PlannerApp').then((module) => ({ default: module.PlannerApp })));
const ApartmentsPage = lazy(() =>
  import('./pages/ApartmentsPage').then((module) => ({ default: module.ApartmentsPage })),
);
const MyApartmentPage = lazy(() =>
  import('./pages/MyApartmentPage').then((module) => ({ default: module.MyApartmentPage })),
);
const SummaryPage = lazy(() => import('./pages/SummaryPage').then((module) => ({ default: module.SummaryPage })));
const InspirationPage = lazy(() =>
  import('./pages/EditorialPages').then((module) => ({ default: module.InspirationPage })),
);
const MaterialsPage = lazy(() =>
  import('./pages/EditorialPages').then((module) => ({ default: module.MaterialsPage })),
);
const ProcessPage = lazy(() => import('./pages/EditorialPages').then((module) => ({ default: module.ProcessPage })));
const AboutPage = lazy(() => import('./pages/EditorialPages').then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const ImportApartmentPage = lazy(() =>
  import('./pages/ImportApartmentPage').then((module) => ({ default: module.ImportApartmentPage })),
);
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

function readRoute(): SiteRoute {
  return parseSiteLocation(window.location.pathname, window.location.search).route;
}

function pageTitle(route: SiteRoute): string {
  const titles: Record<Exclude<SiteRoute['id'], 'design'>, string> = {
    home: 'נגרות תפארת — תכנון נגרות לדירה',
    apartments: 'בחירת דירה — נגרות תפארת',
    'my-apartment': 'הדירה שלי — נגרות תפארת',
    summary: 'סיכום התכנון — נגרות תפארת',
    inspiration: 'גלריית השראה — נגרות תפארת',
    materials: 'חומרים וגימורים — נגרות תפארת',
    process: 'תהליך העבודה — נגרות תפארת',
    about: 'אודות — נגרות תפארת',
    contact: 'צור קשר — נגרות תפארת',
    import: 'ייבוא תוכנית — נגרות תפארת',
    'not-found': 'העמוד לא נמצא — נגרות תפארת',
  };
  return route.id === 'design' ? 'מתכנן הנגרות — נגרות תפארת' : titles[route.id];
}

export function TiferetSite({ onOpenWorkshop }: { onOpenWorkshop: () => void }) {
  const [route, setRoute] = useState<SiteRoute>(readRoute);

  useEffect(() => {
    const parsed = parseSiteLocation(window.location.pathname, window.location.search);
    if (parsed.shouldReplace) window.history.replaceState({}, '', parsed.canonicalPath);
    const onPopState = () => setRoute(readRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';
    document.title = pageTitle(route);
  }, [route]);

  const navigate = useCallback((nextRoute: SiteRoute) => {
    window.history.pushState({}, '', sitePath(nextRoute));
    setRoute(nextRoute);
  }, []);

  if (route.id === 'design') {
    const importedApartment = route.apartmentId
      ? restoreImportedApartments(localStorage).find((apartment) => apartment.id === route.apartmentId)
      : undefined;
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
      <Suspense fallback={<main aria-busy="true">טוען את מתכנן הנגרות…</main>}>
        <PlannerApp
          initialStarted
          initialRoomId={route.roomId}
          initialApartment={importedApartment}
          onExit={() => navigate({ id: importedApartment ? 'import' : 'my-apartment' })}
          onSummary={importedApartment ? undefined : () => navigate({ id: 'summary' })}
        />
      </Suspense>
    );
  }

  const page = (() => {
    switch (route.id) {
      case 'home':
        return <HomePage navigate={navigate} />;
      case 'apartments':
        return <ApartmentsPage navigate={navigate} />;
      case 'my-apartment':
        return <MyApartmentPage navigate={navigate} />;
      case 'summary':
        return <SummaryPage navigate={navigate} />;
      case 'inspiration':
        return <InspirationPage navigate={navigate} />;
      case 'materials':
        return <MaterialsPage navigate={navigate} />;
      case 'process':
        return <ProcessPage navigate={navigate} />;
      case 'about':
        return <AboutPage navigate={navigate} />;
      case 'contact':
        return <ContactPage />;
      case 'import':
        return <ImportApartmentPage navigate={navigate} />;
      case 'not-found':
        return <NotFoundPage navigate={navigate} />;
    }
  })();

  return (
    <div className="ng-site" dir="rtl">
      <SiteHeader route={route} navigate={navigate} onOpenWorkshop={onOpenWorkshop} />
      <main id="ng-main">
        <Suspense fallback={<div aria-busy="true">טוען את העמוד…</div>}>{page}</Suspense>
      </main>
      <SiteFooter navigate={navigate} />
    </div>
  );
}
