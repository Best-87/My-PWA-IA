import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Essential for production environments where process.env might be undefined at runtime
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    (window as any).process.env = (window as any).process.env || {};
    // Ensure API_KEY is defined even if empty to prevent crashes in services
    (window as any).process.env.API_KEY = (window as any).process.env.API_KEY || '';
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

// Minimal Service Worker registration for GitHub Pages
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const isPreview = window.location.hostname.includes('scf.usercontent.goog') || 
                          window.location.hostname.includes('webcontainer');
        
        if (!isPreview) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW OK:', reg.scope))
                .catch(err => console.error('SW Error:', err));
        }
    });
}