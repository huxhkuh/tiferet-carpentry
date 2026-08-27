import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { sriPlugin } from './scripts/vite-plugin-sri.ts';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };
const DEFAULT_BASE_PATH = '/tiferet-carpentry/';

function normalizeBasePath(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const APP_BASE_PATH = normalizeBasePath(process.env['VITE_BASE_PATH'] ?? DEFAULT_BASE_PATH);

/**
 * Phase 12 / Sprint 15 — Cloudflare Web Analytics beacon injection.
 * When `VITE_CF_ANALYTICS_TOKEN` is set at build time, injects the
 * privacy-first beacon script (no cookies, no PII) before </body>.
 */
function cloudflareAnalyticsPlugin() {
  const token = process.env['VITE_CF_ANALYTICS_TOKEN'];
  if (!token) return null;
  return {
    name: 'cf-analytics-inject',
    transformIndexHtml(html: string) {
      const snippet = `\n    <!-- Cloudflare Web Analytics (Phase 12 / Sprint 15) — no cookies, no PII -->\n    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`;
      return html.replace('</body>', `${snippet}\n  </body>`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  cacheDir: resolve(os.tmpdir(), 'WoodworkingShop', '.vite_cache'),
  base: APP_BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    cloudflareAnalyticsPlugin(),
    sriPlugin(APP_BASE_PATH),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      base: APP_BASE_PATH,
      injectRegister: false, // handled manually in useSwUpdate / main.tsx
      manifest: false, // keep the existing public/manifest.json
      workbox: {
        // Explicit opt-outs — never auto-activate the new SW or claim clients
        // without the user clicking "Update now" in the SwUpdateBanner.
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${APP_BASE_PATH}index.html`,
        navigateFallbackDenylist: [new RegExp(`^${escapeRegExp(APP_BASE_PATH)}api/`)],
        // Sprint 149 — offline fallback for navigation requests when cache is empty
        offlineGoogleAnalytics: false,
        runtimeCaching: [
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Cache Google Fonts files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Sprint 149 — cache CDN assets (cdnjs) with SWR for offline resilience
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Sprint 149 — cache locale JSON files for offline i18n
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith(APP_BASE_PATH) && url.pathname.endsWith('.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-json-data',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Sprint 149 — cache app images/SVGs for offline use
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith(APP_BASE_PATH) && /\.(?:png|jpg|svg|webp)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    'import.meta.env.VITE_APP_BASE_PATH': JSON.stringify(APP_BASE_PATH),
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    // v3.24.0: inject modulepreload polyfill for Safari < 16.4 compatibility
    modulePreload: { polyfill: true },
  },
});
