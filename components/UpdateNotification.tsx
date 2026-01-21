import React, { useEffect, useState } from 'react';
import { useTranslation } from '../services/i18n';

export const UpdateNotification: React.FC = () => {
    const { t } = useTranslation();
    const [showUpdate, setShowUpdate] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    // Check if there is already a waiting worker
                    if (registration.waiting) {
                        setWaitingWorker(registration.waiting);
                        setShowUpdate(true);
                    }

                    // Listen for new workers being installed
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setWaitingWorker(newWorker);
                                    setShowUpdate(true);
                                }
                            });
                        }
                    });
                }
            });

            // Handle forced reload once the new SW takes over
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
        }
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            setShowUpdate(false);
        }
    };

    if (!showUpdate) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-[200] animate-slide-up">
            <div className="max-w-md mx-auto bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="material-icons-round text-white">system_update_alt</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight">{t('update_available')}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">Novas funcionalidades prontas para você.</p>
                    </div>
                </div>
                <button
                    onClick={handleUpdate}
                    className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                    {t('btn_update')}
                </button>
            </div>
        </div>
    );
};
