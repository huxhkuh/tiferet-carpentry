import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { TiferetSite } from './site/TiferetSite';
import { buildAppModeUrl, readAppMode, type AppMode } from './utils/app-mode';

const WorkshopMode = lazy(() => import('./WorkshopMode'));

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
    return <TiferetSite onOpenWorkshop={() => navigate('workshop')} />;
  }

  return (
    <Suspense fallback={<main aria-busy="true">טוען את סביבת הנגרייה…</main>}>
      <WorkshopMode />
    </Suspense>
  );
}
