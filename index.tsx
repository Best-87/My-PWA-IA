// Este archivo es el punto de entrada para herramientas de build locales.
// Para GitHub Pages (carga directa via Babel), la lógica principal está en el script del index.html.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
}

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML.includes('WeighingForm')) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}