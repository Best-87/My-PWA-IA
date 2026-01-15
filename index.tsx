import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Safety check for process.env in browser environments without build step replacement
if (typeof process === 'undefined') {
    (window as any).process = { env: { API_KEY: '' } };
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
    // Use relative path './sw.js' instead of absolute '/sw.js' for GitHub Pages compatibility
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registered: ', registration.scope);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}