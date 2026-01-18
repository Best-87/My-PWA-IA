import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Failsafe para entorno de navegador
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    (window as any).process.env = (window as any).process.env || {};
    // La API_KEY se inyecta externamente, pero aseguramos que no sea undefined
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

// Registro de Service Worker optimizado para GitHub Pages
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const hostname = window.location.hostname;
        
        // Evitamos el Service Worker en entornos de desarrollo/previsualización
        const isDevelopment = 
            hostname.includes('scf.usercontent.goog') || 
            hostname.includes('webcontainer') || 
            hostname.includes('ai.studio') ||
            hostname.includes('localhost');
        
        if (!isDevelopment) {
            // Usamos ./sw.js para que sea relativo a la subcarpeta del repositorio
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('PWA: Ready', reg.scope))
                .catch(err => console.warn('PWA: SW registration skipped', err));
        } else {
            console.log('PWA: Service Worker disabled for dev/preview.');
        }
    });
}