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

export type SiteRoute =
  | { id: StaticSiteRouteId; apartmentId?: string }
  | { id: 'design'; roomId: string; apartmentId?: string; designId?: string };

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
  const apartmentId = new URLSearchParams(search).get('apartment')?.trim();
  const designId = new URLSearchParams(search).get('design')?.trim();
  const normalized = relativePath.replace(/^\/+|\/+$/g, '');
  if (!normalized) return { id: 'home' };
  if (normalized.startsWith('design/')) {
    let roomId: string;
    try {
      roomId = decodeURIComponent(normalized.slice('design/'.length));
    } catch {
      return { id: 'not-found' };
    }
    return roomId
      ? { id: 'design', roomId, ...(apartmentId ? { apartmentId } : {}), ...(designId ? { designId } : {}) }
      : { id: 'not-found' };
  }
  if (STATIC_ROUTES.has(normalized as StaticSiteRouteId))
    return { id: normalized as StaticSiteRouteId, ...(apartmentId ? { apartmentId } : {}) };
  return { id: 'not-found' };
}

export function sitePath(route: SiteRoute, basePath = DEFAULT_BASE_PATH): string {
  const base = normalizeBasePath(basePath);
  if (route.id === 'home') return base;
  if (route.id === 'design') {
    const query = new URLSearchParams();
    if (route.apartmentId) query.set('apartment', route.apartmentId);
    if (route.designId) query.set('design', route.designId);
    const apartmentQuery = query.size ? `?${query}` : '';
    return `${base}design/${encodeURIComponent(route.roomId)}${apartmentQuery}`;
  }
  if (route.id === 'not-found') return `${base}not-found`;
  return `${base}${route.id}${route.apartmentId ? `?apartment=${encodeURIComponent(route.apartmentId)}` : ''}`;
}

export function parseSiteLocation(pathname: string, search: string, basePath = DEFAULT_BASE_PATH): ParsedSiteLocation {
  const base = normalizeBasePath(basePath);
  const redirectedPath = new URLSearchParams(search).get('p');
  const relativePath = redirectedPath
    ? redirectedPath
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
