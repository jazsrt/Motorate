import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pushNotifications';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { initSentry } from './lib/sentry';

// Initialize Sentry before rendering
initSentry();

registerServiceWorker().catch(err => {
  console.warn('Service Worker registration skipped:', err.message || err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
