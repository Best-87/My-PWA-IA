
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Inyección forzada de variables de entorno para el cliente
// Esto permite que el SDK de Google lea process.env.API_KEY en Vercel
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.process = window.process || { env: {} };
    // @ts-ignore
    window.process.env = {
        ...((window as any).process?.env || {}),
        API_KEY: process.env.API_KEY || ''
    };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isPreviewEnv = window.location.hostname.includes('scf.usercontent.goog') || 
                         window.location.hostname.includes('webcontainer') ||
                         window.location.hostname.includes('ai.studio');

    if (!isPreviewEnv) {
        // Use absolute path for SW to avoid 404s in subdirectories or nested routes
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration.scope);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
    } else {
        console.log('Service Worker registration skipped in preview environment.');
    }
  });
}
