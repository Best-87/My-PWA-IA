import React, { useEffect, useState } from 'react';
import { InstallPromptEvent } from '../types';
import { useTranslation } from '../services/i18n';

export const InstallManager: React.FC = () => {
    const { t } = useTranslation();
    const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    
    // Update State
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        // Detect iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        // Check early capture from index.html
        if ((window as any).deferredPrompt) {
            console.log("InstallManager: Found early deferredPrompt");
            setDeferredPrompt((window as any).deferredPrompt);
            checkShouldShow();
        }

        // Listener for runtime event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            console.log("InstallManager: Runtime event captured");
            setDeferredPrompt(e as InstallPromptEvent);
            (window as any).deferredPrompt = e;
            checkShouldShow();
        };

        const handleAppInstalled = () => {
            console.log("App installed");
            setShowToast(false);
            setDeferredPrompt(null);
            (window as any).deferredPrompt = null;
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Service Worker Updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (!reg) return;
                if (reg.waiting) {
                    setWaitingWorker(reg.waiting);
                    setUpdateAvailable(true);
                }
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setWaitingWorker(newWorker);
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
            });
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }

        // Check iOS manual install needed
        if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
            setTimeout(() => setShowToast(true), 3000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const checkShouldShow = () => {
        // Don't show if already standalone
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        
        // Logic: Show after a short delay to be non-intrusive
        setTimeout(() => {
            setShowToast(true);
        }, 3000);
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            if (outcome === 'accepted') {
                setShowToast(false);
            }
            setDeferredPrompt(null);
            (window as any).deferredPrompt = null;
        }
    };

    const updateApp = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
        }
    };

    if (!showToast && !updateAvailable) return null;

    return (
        <>
            {/* TOAST INSTALL PROMPT (Based on requested strategy) */}
            {showToast && (
                <div className="fixed bottom-5 right-5 z-[100] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-4 max-w-sm w-[90%] border border-zinc-100 dark:border-zinc-700 animate-slide-up flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                            <span className="material-icons-round text-2xl">install_mobile</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Instalar Conferente Pro</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                                {isIOS 
                                    ? "En iOS: Pulsa 'Compartir' y selecciona 'Añadir a pantalla de inicio'." 
                                    : "Instala la app para mejor rendimiento y acceso offline."}
                            </p>
                        </div>
                        <button onClick={() => setShowToast(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <span className="material-icons-round text-lg">close</span>
                        </button>
                    </div>
                    
                    {!isIOS && (
                        <div className="flex gap-2 mt-1">
                            <button 
                                onClick={handleInstallClick} 
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                Instalar App
                            </button>
                            <button 
                                onClick={() => setShowToast(false)} 
                                className="px-4 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                            >
                                Después
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Update Available Notification */}
            {updateAvailable && (
                <div className="fixed top-6 left-0 right-0 z-[150] flex justify-center px-4 animate-slide-down pointer-events-none">
                    <div className="pointer-events-auto bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
                                <span className="material-icons-round text-lg">system_update</span>
                             </div>
                             <div className="flex flex-col">
                                 <span className="text-xs font-bold">Nueva versión disponible</span>
                                 <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none">Actualización lista</span>
                             </div>
                        </div>
                        <button 
                            onClick={updateApp} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            Actualizar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};