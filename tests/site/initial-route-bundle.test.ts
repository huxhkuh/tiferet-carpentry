import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Tiferet initial-route bundle', () => {
  it('loads the workshop, planner and Tailwind shell only when their routes are opened', () => {
    const appSource = readSource('src/App.tsx');
    const homeSource = readSource('src/site/pages/HomePage.tsx');
    const mainSource = readSource('src/main.tsx');
    const siteSource = readSource('src/site/TiferetSite.tsx');

    expect(appSource).not.toContain("from './WoodworkingShopApp'");
    expect(appSource).not.toContain("from './i18n'");
    expect(appSource).not.toContain("import './index.css'");
    expect(appSource).not.toContain("from './site/TiferetSite'");
    expect(appSource).toContain("lazy(() => import('./WorkshopMode'))");
    expect(appSource).toContain("import('./site/TiferetSite')");
    expect(mainSource).not.toContain("from './store/cabinet-store.ts'");
    expect(mainSource).toContain('requestAnimationFrame(() =>');
    expect(mainSource).toContain('requestAnimationFrame(mountApp)');
    expect(siteSource).not.toContain("from '../apartment/PlannerApp'");
    expect(siteSource).toContain("import('../apartment/PlannerApp')");
    expect(siteSource).not.toContain("from './pages/ApartmentsPage'");
    expect(siteSource).not.toContain("from './pages/MyApartmentPage'");
    expect(siteSource).not.toContain("from './pages/SummaryPage'");
    expect(siteSource).toContain("import('./pages/ApartmentsPage')");
    expect(siteSource).toContain("import('./pages/MyApartmentPage')");
    expect(siteSource).toContain("import('./pages/SummaryPage')");
    expect(homeSource).not.toContain("from '../../apartment/data/tiferet'");
    expect(homeSource).toContain("import('./HomeDetails')");
  });

  it('lets the bundler preserve lazy-route dependency boundaries', () => {
    const viteSource = readSource('vite.config.ts');

    expect(viteSource).not.toContain('manualChunks');
  });
});
