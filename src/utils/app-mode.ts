export type AppMode = 'site' | 'workshop';

export function readAppMode(search: string): AppMode {
  return new URLSearchParams(search).get('app') === 'workshop' ? 'workshop' : 'site';
}

export function buildAppModeUrl(search: string, mode: AppMode): string {
  const params = new URLSearchParams(search);
  if (mode === 'workshop') params.set('app', mode);
  else params.delete('app');
  const query = params.toString();
  return query ? `?${query}` : '';
}
