import { useCallback, useEffect, useState } from 'react';

import i18n, { RTL_LANGS, type SupportedLang } from './i18n';
import './index.css';
import { TiferetSite } from './site/TiferetSite';
import { buildAppModeUrl, readAppMode, type AppMode } from './utils/app-mode';
import WoodworkingShopApp from './WoodworkingShopApp';

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

  useEffect(() => {
    if (mode !== 'workshop') return;
    const language = i18n.language as SupportedLang;
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGS.has(language) ? 'rtl' : 'ltr';
    document.title = 'Cabinet Planner — Woodworking Design Tool';
  }, [mode]);

  const navigate = useCallback((nextMode: AppMode) => {
    replaceMode(nextMode);
    setMode(nextMode);
  }, []);

  if (mode === 'site') {
    return <TiferetSite onOpenWorkshop={() => navigate('workshop')} />;
  }

  return <WoodworkingShopApp />;
}
