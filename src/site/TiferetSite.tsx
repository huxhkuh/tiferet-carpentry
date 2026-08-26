import { useCallback, useEffect, useState } from 'react';
import { PlannerApp } from '../apartment/PlannerApp';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { AboutPage, InspirationPage, MaterialsPage, ProcessPage } from './pages/EditorialPages';
import { ApartmentsPage } from './pages/ApartmentsPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { MyApartmentPage } from './pages/MyApartmentPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SummaryPage } from './pages/SummaryPage';
import { parseSiteLocation, sitePath, type SiteRoute } from './router';
import './site.css';

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
    return (
      <PlannerApp
        initialStarted
        initialRoomId={route.roomId}
        onExit={() => navigate({ id: 'my-apartment' })}
        onSummary={() => navigate({ id: 'summary' })}
      />
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
      case 'not-found':
        return <NotFoundPage navigate={navigate} />;
    }
  })();

  return (
    <div className="ng-site" dir="rtl">
      <SiteHeader route={route} navigate={navigate} onOpenWorkshop={onOpenWorkshop} />
      <main id="ng-main">{page}</main>
      <SiteFooter navigate={navigate} />
    </div>
  );
}
