export type StaticSiteRouteId =
  | 'home'
  | 'apartments'
  | 'my-apartment'
  | 'summary'
  | 'inspiration'
  | 'materials'
  | 'process'
  | 'about'
  | 'contact'
  | 'import'
  | 'not-found';

export type SiteRoute = { id: StaticSiteRouteId } | { id: 'design'; roomId: string; apartmentId?: string };

export interface ParsedSiteLocation {
  route: SiteRoute;
  canonicalPath: string;
  shouldReplace: boolean;
}

const DEFAULT_BASE_PATH = import.meta.env.VITE_APP_BASE_PATH || import.meta.env.BASE_URL || '/tiferet-carpentry/';
const STATIC_ROUTES = new Set<StaticSiteRouteId>([
  'apartments',
  'my-apartment',
  'summary',
  'inspiration',
  'materials',
  'process',
  'about',
  'contact',
  'import',
]);

function normalizeBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function routeFromRelativePath(relativePath: string, search: string): SiteRoute {
  const normalized = relativePath.replace(/^\/+|\/+$/g, '');
  if (!normalized) return { id: 'home' };
  if (normalized.startsWith('design/')) {
    const roomId = decodeURIComponent(normalized.slice('design/'.length));
    const apartmentId = new URLSearchParams(search).get('apartment')?.trim();
    return roomId ? { id: 'design', roomId, ...(apartmentId ? { apartmentId } : {}) } : { id: 'not-found' };
  }
  if (STATIC_ROUTES.has(normalized as StaticSiteRouteId)) return { id: normalized as StaticSiteRouteId };
  return { id: 'not-found' };
}

export function sitePath(route: SiteRoute, basePath = DEFAULT_BASE_PATH): string {
  const base = normalizeBasePath(basePath);
  if (route.id === 'home') return base;
  if (route.id === 'design') {
    const apartmentQuery = route.apartmentId ? `?apartment=${encodeURIComponent(route.apartmentId)}` : '';
    return `${base}design/${encodeURIComponent(route.roomId)}${apartmentQuery}`;
  }
  if (route.id === 'not-found') return `${base}not-found`;
  return `${base}${route.id}`;
}

export function parseSiteLocation(pathname: string, search: string, basePath = DEFAULT_BASE_PATH): ParsedSiteLocation {
  const base = normalizeBasePath(basePath);
  const redirectedPath = new URLSearchParams(search).get('p');
  const relativePath = redirectedPath
    ? decodeURIComponent(redirectedPath)
    : pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname === base.slice(0, -1) || pathname === '/'
        ? ''
        : pathname.replace(/^\//, '');
  const route = routeFromRelativePath(relativePath, search);
  return {
    route,
    canonicalPath: sitePath(route, base),
    shouldReplace: redirectedPath !== null,
  };
}
