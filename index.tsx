import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Asegurar entorno process antes de renderizar
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    (window as any).process.env = (window as any).process.env || {};
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

// Registro de Service Worker relativo
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('webcontainer');
        
        if (!isLocal) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered', reg.scope))
                .catch(err => console.warn('SW Error', err));
        }
    });
}