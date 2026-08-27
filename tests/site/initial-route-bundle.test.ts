import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Tiferet initial-route bundle', () => {
  it('loads the workshop, planner and Tailwind shell only when their routes are opened', () => {
    const appSource = readSource('src/App.tsx');
    const mainSource = readSource('src/main.tsx');
    const siteSource = readSource('src/site/TiferetSite.tsx');

    expect(appSource).not.toContain("from './WoodworkingShopApp'");
    expect(appSource).not.toContain("from './i18n'");
    expect(appSource).not.toContain("import './index.css'");
    expect(appSource).toContain("lazy(() => import('./WorkshopMode'))");
    expect(mainSource).not.toContain("from './store/cabinet-store.ts'");
    expect(siteSource).not.toContain("from '../apartment/PlannerApp'");
    expect(siteSource).toContain("import('../apartment/PlannerApp')");
  });
});
