
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
             <div className={`bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-white text-left ${className}`}>
                <h3 className="font-bold text-white mb-2 flex items-center gap-2 font-display">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M12 12V6m0 0l-3 3m3-3l3 3" />
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
            <div className={`bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-center shadow-xl ${className} relative overflow-hidden group`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-400 to-primary"></div>
                <div className="text-4xl mb-4 bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary">📱</div>
                <h2 className="text-xl font-bold font-display text-white mb-2">Instalar App Nativa</h2>
                <p className="text-white/60 mb-6 text-sm max-w-sm mx-auto">Obtén acceso rápido, modo sin conexión y una experiencia inmersiva.</p>
                <button 
                    onClick={handleInstallClick}
                    className="bg-primary hover:bg-[#6a11cb] text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-primary/30 transform transition-all hover:-translate-y-1 active:translate-y-0 duration-200 w-full sm:w-auto flex items-center justify-center gap-2 mx-auto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Instalar Conferente
                </button>
            </div>
        );
    }

    return null;
};
