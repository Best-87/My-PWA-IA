
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Initialize Eruda for debugging in Vercel/Production
if (typeof window !== 'undefined' && (window as any).eruda) {
    (window as any).eruda.init();
}

// Global Environment Injection
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    // Safety merge of environment variables
    (window as any).process.env = {
        ...(window as any).process.env,
        API_KEY: (process.env && process.env.API_KEY) || ''
    };
    console.log('Environment initialized. API_KEY present:', !!(window as any).process.env.API_KEY);
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
    }
  });
}
