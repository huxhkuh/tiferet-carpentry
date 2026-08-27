import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initErrorReporter } from './services/error-reporter.ts';

// Sprint 150 — wire global error/rejection handlers for privacy-first monitoring.
initErrorReporter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
