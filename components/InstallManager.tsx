
import React, { useEffect, useState } from 'react';
import { InstallPromptEvent } from '../types';
import { useTranslation } from '../services/i18n';

export const InstallManager: React.FC = () => {
    const { t } = useTranslation();
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        // 1. Handle Install Prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as InstallPromptEvent);
            
            // Auto-show modal if not installed
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                setTimeout(() => setShowInstallModal(true), 2000); // Wait 2s before showing
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 2. Handle Service Worker Updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
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
        window.location.reload();
    };

    return (
        <>
            {/* Update Toast */}
            {updateAvailable && (
                <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-bounce border border-white/10">
                        <span className="material-icons-round text-yellow-400 dark:text-orange-500">system_update</span>
                        <span className="text-sm font-bold">{t('update_available')}</span>
                        <button onClick={updateApp} className="bg-white/20 dark:bg-slate-200/50 hover:bg-white/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide">{t('btn_update')}</button>
                    </div>
                </div>
            )}

            {/* Install Modal */}
            {showInstallModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl transform transition-all animate-slide-up relative overflow-hidden">
                        
                        {/* Decorative Background Blob */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary-500 to-primary-700 rounded-b-[50%] -mt-16"></div>

                        <div className="relative flex justify-center mb-6 mt-4">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-xl">
                                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-full flex items-center justify-center shadow-inner">
                                    <span className="material-icons-round text-white text-3xl">download</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-3 leading-tight">{t('install_modal_title')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-center text-sm leading-relaxed px-2">
                            {t('install_modal_desc')}
                        </p>
                        
                        <div className="mt-8 flex flex-col gap-3">
                            <button onClick={installApp} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-95 transition-all">
                                {t('btn_install')}
                            </button>
                            <button onClick={() => setShowInstallModal(false)} className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-3 text-sm font-bold">
                                {t('btn_not_now')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
