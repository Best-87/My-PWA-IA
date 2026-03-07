
import React, { useEffect, useState } from 'react';
import { InstallPromptEvent, AppStatus } from '../types';
import { trackEvent } from '../services/analyticsService';

interface InstallPromptProps {
    className?: string;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ className }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as InstallPromptEvent);
            setStatus(AppStatus.INSTALLABLE);
            trackEvent('app_install_available', { platform: 'android/desktop' });
        };

        const handleAppInstalled = () => {
            setStatus(AppStatus.INSTALLED);
            setDeferredPrompt(null);
            trackEvent('app_installed', { method: 'browser_event' });
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Check if already standalone
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setStatus(AppStatus.INSTALLED);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        trackEvent('app_install_clicked');
        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setStatus(AppStatus.INSTALLED);
            trackEvent('app_installed', { method: 'user_accepted' });
        } else {
            trackEvent('app_install_dismissed');
        }
        setDeferredPrompt(null);
    };

    if (status === AppStatus.INSTALLED) {
        return null;
    }

    if (isIOS) {
        return (
            <div className={`bg-zinc-900 border-2 border-zinc-700 p-5 rounded-none text-white text-left ${className}`}>
                <h3 className="font-bold text-white mb-2 flex items-center gap-2 font-display uppercase tracking-widest text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 18h.01M12 12V6m0 0l-3 3m3-3l3 3" />
                    </svg>
                    Instalar en iOS
                </h3>
                <p className="text-sm text-white/70 mb-2">Para una mejor experiencia:</p>
                <ol className="list-decimal list-inside text-sm mt-1 text-white/80 space-y-1">
                    <li>Pulsa el botón <strong>Compartir</strong> <span className="inline-block bg-white/20 rounded px-1 text-xs">⎋</span></li>
                    <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                </ol>
            </div>
        )
    }

    if (status === AppStatus.INSTALLABLE) {
        return (
            <div className={`bg-zinc-900 border-2 border-zinc-700 p-6 rounded-none text-center shadow-sm ${className} relative overflow-hidden group`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                <div className="text-4xl mb-4 bg-zinc-800 w-16 h-16 rounded-none border-2 border-zinc-700 flex items-center justify-center mx-auto text-blue-500">📱</div>
                <h2 className="text-xl font-bold font-display text-white mb-2 uppercase tracking-widest">Instalar App</h2>
                <p className="text-zinc-400 mb-6 text-xs max-w-sm mx-auto uppercase tracking-widest">ACCESO OFFLINE Y MAYOR VELOCIDAD</p>
                <button
                    onClick={handleInstallClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-none border-2 border-blue-800 transition-colors w-full sm:w-auto flex items-center justify-center gap-2 mx-auto uppercase tracking-widest text-xs"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    INSTALAR CONFERENTE
                </button>
            </div>
        );
    }

    return null;
};
