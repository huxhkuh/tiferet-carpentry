import { useEffect } from 'react';

import WoodworkingShopApp from './WoodworkingShopApp';
import i18n, { RTL_LANGS, type SupportedLang } from './i18n';
import './index.css';
import { useCabinetStore } from './store/cabinet-store';

const PREFERENCES_KEY = 'woodworkingshop:prefs';

function followsOperatingSystemTheme(): boolean {
  const savedPreferences = window.localStorage.getItem(PREFERENCES_KEY);
  if (!savedPreferences) return true;

  try {
    const parsedPreferences = JSON.parse(savedPreferences) as { darkMode?: unknown };
    return parsedPreferences.darkMode === undefined;
  } catch {
    return true;
  }
}

export default function WorkshopMode() {
  useEffect(() => {
    const language = i18n.language as SupportedLang;
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGS.has(language) ? 'rtl' : 'ltr';
    document.title = 'Cabinet Planner — Woodworking Design Tool';

    if (typeof window.matchMedia !== 'function') return undefined;

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const synchronizeTheme = (event: MediaQueryListEvent) => {
      if (followsOperatingSystemTheme()) useCabinetStore.setState({ darkMode: event.matches });
    };
    colorScheme.addEventListener('change', synchronizeTheme);
    return () => colorScheme.removeEventListener('change', synchronizeTheme);
  }, []);

  return <WoodworkingShopApp />;
}
