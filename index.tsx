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

// Robust Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const hostname = window.location.hostname;
        
        // Skip SW if we are in an AI Studio / WebContainer preview to avoid Origin errors
        const isPreview = 
            hostname.includes('scf.usercontent.goog') || 
            hostname.includes('webcontainer') || 
            hostname.includes('ai.studio') ||
            hostname.includes('localhost') ||
            hostname.includes('127.0.0.1');
        
        if (!isPreview) {
            // Register using a relative path to handle subfolders in GitHub Pages
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered on scope:', reg.scope))
                .catch(err => console.warn('SW Registration failed (this is normal in some preview envs):', err));
        } else {
            console.log('Service Worker skipped for preview environment compatibility.');
        }
    });
}