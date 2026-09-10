import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/** Keep authored dictionaries intact; ship only overrides of the English fallback. */
export function localeFallbackPlugin(): Plugin {
  const directory = resolve('src/i18n').replaceAll('\\', '/');
  const english: unknown = JSON.parse(readFileSync(resolve('src/i18n/en.json'), 'utf8'));
  const compact = (value: unknown, fallback: unknown): unknown => {
    if (JSON.stringify(value) === JSON.stringify(fallback)) return undefined;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    const reference = fallback && typeof fallback === 'object' ? (fallback as Record<string, unknown>) : {};
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        const result = compact(entry, reference[key]);
        return result === undefined ||
          (typeof result === 'object' && result !== null && !Array.isArray(result) && Object.keys(result).length === 0)
          ? []
          : [[key, result]];
      }),
    );
  };
  return {
    name: 'deduplicate-locale-fallback',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      const path = id.replaceAll('\\', '/').split('?')[0];
      if (!['he', 'ar', 'de', 'es', 'fr'].some((locale) => path === `${directory}/${locale}.json`)) return;
      return { code: JSON.stringify(compact(JSON.parse(code), english) ?? {}), map: null };
    },
  };
}
