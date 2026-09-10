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

// The HTML shell is visible while modules load; start the application as soon as they are ready.
mountApp();
