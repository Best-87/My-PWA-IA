import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Failsafe for environment variables in the browser
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

// Robust Service Worker registration for GitHub Pages
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        
        // En GitHub Pages usamos la ruta absoluta del repositorio
        const swPath = isLocal ? './sw.js' : '/My-PWA-IA/sw.js';
        
        navigator.serviceWorker.register(swPath)
            .then(reg => console.log('SW Registered on scope:', reg.scope))
            .catch(err => console.warn('SW Registration failed:', err));
    });
}