
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Safety check for process.env in browser environments without build step replacement
// Crucial for GitHub Pages and Vercel client-side execution
// @ts-ignore
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    (window as any).process.env = {
        ...(window as any).process.env,
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
        navigator.serviceWorker.register('./sw.js')
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
