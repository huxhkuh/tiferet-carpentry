import { describe, expect, it } from 'vitest';

import { parseSiteLocation, sitePath } from '../../src/site/router';

describe('Tiferet site routing', () => {
  it.each([
    ['/tiferet-carpentry/', '', 'home'],
    ['/tiferet-carpentry/apartments', '', 'apartments'],
    ['/tiferet-carpentry/my-apartment/', '', 'my-apartment'],
    ['/tiferet-carpentry/summary', '', 'summary'],
    ['/tiferet-carpentry/inspiration', '', 'inspiration'],
    ['/tiferet-carpentry/materials', '', 'materials'],
    ['/tiferet-carpentry/process', '', 'process'],
    ['/tiferet-carpentry/about', '', 'about'],
    ['/tiferet-carpentry/contact', '', 'contact'],
  ] as const)('maps %s to the %s page', (pathname, search, expectedId) => {
    expect(parseSiteLocation(pathname, search).route.id).toBe(expectedId);
  });

  it('decodes the selected room from a design route', () => {
    expect(parseSiteLocation('/tiferet-carpentry/design/bedroom', '').route).toEqual({
      id: 'design',
      roomId: 'bedroom',
    });
  });

  it('recovers a direct GitHub Pages route from the existing p query parameter', () => {
    expect(parseSiteLocation('/tiferet-carpentry/', '?p=materials')).toEqual({
      route: { id: 'materials' },
      canonicalPath: '/tiferet-carpentry/materials',
      shouldReplace: true,
    });
  });

  it('keeps unknown paths explicit instead of silently showing the wrong page', () => {
    expect(parseSiteLocation('/tiferet-carpentry/not-a-page', '').route).toEqual({ id: 'not-found' });
  });

  it('builds base-aware links without a routing dependency', () => {
    expect(sitePath({ id: 'home' })).toBe('/tiferet-carpentry/');
    expect(sitePath({ id: 'design', roomId: 'safe-room' })).toBe('/tiferet-carpentry/design/safe-room');
  });
});
