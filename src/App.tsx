import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { buildAppModeUrl, readAppMode, type AppMode } from './utils/app-mode';

const WorkshopMode = lazy(() => import('./WorkshopMode'));
const TiferetSite = lazy(() => import('./site/TiferetSite').then((module) => ({ default: module.TiferetSite })));

function SiteBootstrapFallback() {
  return (
    <div id="tiferet-bootstrap-shell" role="status" aria-label="טוען את אתר תפארת">
      <div>
        <span className="tiferet-bootstrap__mark" aria-hidden="true">
          ת
        </span>
        <p className="tiferet-bootstrap__eyebrow">תפארת · רמלה</p>
        <p className="tiferet-bootstrap__title">תכנון מדויק. נגרות אישית.</p>
        <div className="tiferet-bootstrap__line" aria-hidden="true" />
      </div>
    </div>
  );
}

function replaceMode(mode: AppMode): void {
  const search = buildAppModeUrl(window.location.search, mode);
  window.history.pushState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(() => readAppMode(window.location.search));

  useEffect(() => {
    const onPopState = () => setMode(readAppMode(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextMode: AppMode) => {
    replaceMode(nextMode);
    setMode(nextMode);
  }, []);

  if (mode === 'site') {
    return (
      <Suspense fallback={<SiteBootstrapFallback />}>
        <TiferetSite onOpenWorkshop={() => navigate('workshop')} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<main aria-busy="true">טוען את סביבת הנגרייה…</main>}>
      <WorkshopMode />
    </Suspense>
  );
}
