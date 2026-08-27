import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('index asset paths', () => {
  it('lets Vite apply the configured base path exactly once', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).not.toContain('href="%BASE_URL%');
    expect(html).toContain('href="/manifest.json"');
    expect(html).toContain('href="/icon-192.png"');
    expect(html).not.toContain('rel="preload" href="/manifest.json"');
    expect(html).not.toContain('rel="preload" href="/icon-192.png"');
    expect(html).toMatch(/rel="preload"\s+as="image"\s+href="\/tiferet\/brand\/hero-bedroom-cabinetry-1200\.webp"/u);
    expect(html).toContain('hero-bedroom-cabinetry-720.webp 720w');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('imagesizes="(max-width: 60rem) 100vw, 58vw"');
  });

  it('renders a lightweight branded status before React starts', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('id="tiferet-bootstrap-shell"');
    expect(html).toContain('טוען את אתר תפארת');
    expect(html).toContain('תכנון מדויק. נגרות אישית.');
  });
});
