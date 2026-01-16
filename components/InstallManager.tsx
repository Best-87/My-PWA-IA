import React, { useEffect, useState } from 'react';
import { InstallPromptEvent } from '../types';
import { useTranslation } from '../services/i18n';

export const InstallManager: React.FC = () => {
    const { t } = useTranslation();
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    
    // Update State
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        // 1. Handle Install Prompt (PWA)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as InstallPromptEvent);
            
            // Auto-show modal if not installed (and not previously dismissed logic could go here)
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                setTimeout(() => setShowInstallModal(true), 3000); 
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 2. Handle Service Worker Updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (!reg) return;

                // Case A: SW is already waiting (update was downloaded in background)
                if (reg.waiting) {
                    setWaitingWorker(reg.waiting);
                    setUpdateAvailable(true);
                }

                // Case B: Update is found now
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            // Only notify if there is an existing controller (meaning it's an update, not first load)
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setWaitingWorker(newWorker);
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
            });

            // 3. Listen for controller change (when SKIP_WAITING is called)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const installApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstallModal(false);
        }
    };

    const updateApp = () => {
        if (waitingWorker) {
            // Send message to SW to trigger skipWaiting
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
            // Fallback
            window.location.reload();
        }
    };

    return (
        <>
            {/* Update Toast (Top fixed) */}
            {updateAvailable && (
                <div className="fixed top-6 left-0 right-0 z-[150] flex justify-center px-4 animate-slide-down">
                    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 animate-pulse">
                                <span className="material-icons-round text-lg">system_update</span>
                             </div>
                             <div className="flex flex-col">
                                 <span className="text-xs font-bold">{t('update_available')}</span>
                                 <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none">V7.0 Ready</span>
                             </div>
                        </div>
                        <button 
                            onClick={updateApp} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            {t('btn_update')}
                        </button>
                    </div>
                </div>
            )}

            {/* Install Modal */}
            {showInstallModal && (
                <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl transform transition-all animate-slide-up relative overflow-hidden border border-white/20">
                        
                        {/* Decorative Background Blob */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary-500 to-primary-700 rounded-b-[50%] -mt-16"></div>

                        <div className="relative flex justify-center mb-6 mt-4">
                            <div className="bg-white dark:bg-zinc-900 p-2 rounded-full shadow-xl">
                                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-full flex items-center justify-center shadow-inner">
                                    <span className="material-icons-round text-white text-3xl">download</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-center text-zinc-800 dark:text-white mb-3 leading-tight">{t('install_modal_title')}</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-center text-sm leading-relaxed px-2">
                            {t('install_modal_desc')}
                        </p>
                        
                        <div className="mt-8 flex flex-col gap-3">
                            <button onClick={installApp} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-black text-lg shadow-xl shadow-zinc-900/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-95 transition-all">
                                {t('btn_install')}
                            </button>
                            <button onClick={() => setShowInstallModal(false)} className="w-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-3 text-sm font-bold">
                                {t('btn_not_now')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};