
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

        let updateInterval: NodeJS.Timeout;
        let onVisibilityChange: () => void;

        if ('serviceWorker' in navigator) {
            const checkUpdate = () => {
                navigator.serviceWorker.getRegistration().then((reg) => {
                    if (!reg) return;

                    // Force update check
                    reg.update();

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
                }).catch(err => {
                    console.log('SW update check failed:', err);
                });
            };

            // Initial check
            checkUpdate();

            // Periodic check every 30 seconds to aggressively detect Vercel deploys
            updateInterval = setInterval(checkUpdate, 30000);

            // Aggressively check when user returns to app
            onVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    checkUpdate();
                }
            };
            document.addEventListener('visibilitychange', onVisibilityChange);

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
            if (updateInterval) clearInterval(updateInterval);
            if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange);
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
            // The controllerchange listener will reload the page
        } else {
            window.location.reload();
        }
    };

    if (!showToast && !updateAvailable) return null;

    return (
        <>
            {/* TOAST INSTALL PROMPT */}
            {showToast && (
                <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 fixed bottom-5 right-5 z-[100] rounded-none shadow-xl p-4 max-w-sm w-[90%] animate-slide-up flex flex-col gap-3">
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
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-none py-2.5 text-xs font-bold active:bg-blue-800 transition-colors uppercase tracking-widest border-2 border-blue-800"
                            >
                                INSTALAR
                            </button>
                            <button
                                onClick={() => setShowToast(false)}
                                className="px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-none py-2.5 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors uppercase tracking-widest border-2 border-zinc-300 dark:border-zinc-700"
                            >
                                DEPOIS
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Update Available Notification */}
            {updateAvailable && (
                <div className="fixed top-2 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
                    <div className="pointer-events-auto bg-zinc-900 dark:bg-white text-white dark:text-black py-2 px-3 rounded-none shadow-none border-4 border-blue-600 dark:border-blue-500 flex items-center gap-3 animate-slide-down max-w-fit">
                        <div className="w-8 h-8 rounded-none bg-blue-600 flex items-center justify-center shrink-0">
                            <span className="material-icons-round text-white text-base">refresh</span>
                        </div>
                        <div className="flex flex-col pr-1">
                            <h4 className="font-black text-[11px] uppercase tracking-wider leading-none">{t('update_available')}</h4>
                        </div>
                        <button
                            onClick={updateApp}
                            className="bg-white dark:bg-black text-black dark:text-white px-4 py-1.5 rounded-none border-2 border-white dark:border-black text-[10px] font-black uppercase tracking-tight hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {t('btn_update')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
