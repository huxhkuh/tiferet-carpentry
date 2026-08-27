import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initErrorReporter } from './services/error-reporter.ts';

// Sprint 150 — wire global error/rejection handlers for privacy-first monitoring.
initErrorReporter();

let mounted = false;

function mountApp(): void {
  if (mounted) return;
  mounted = true;

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Application root element is missing.');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Preserve one browser paint for the inline branded shell before React replaces it.
// The timeout keeps background tabs functional because requestAnimationFrame pauses there.
window.setTimeout(mountApp, 250);
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(mountApp);
});
