
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppContent from './App';
import { LanguageProvider } from './services/i18n';
import { ToastProvider } from './components/Toast';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  </React.StrictMode>
);

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isPreviewEnv = window.location.hostname.includes('scf.usercontent.goog') ||
      window.location.hostname.includes('webcontainer') ||
      window.location.hostname.includes('ai.studio');

    if (!isPreviewEnv) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration.scope);

          // Check for updates on every page load
          registration.update();

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available - Dispatch custom event
                  console.log('New content detected. Firing sw-update.');
                  window.dispatchEvent(new CustomEvent('sw-update', { detail: registration }));
                }
              }
            };
          };
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
