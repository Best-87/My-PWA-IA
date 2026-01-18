import React, { useState, useEffect } from 'react';
import { WeighingForm } from './components/WeighingForm.tsx';
import { getRecords } from './services/storageService.ts';
import { LanguageProvider } from './services/i18n.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';

const AppContent = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('weigh');

    if (isLoading) {
        return <SplashScreen onFinish={() => setIsLoading(false)} />;
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] dark:bg-black transition-colors">
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 p-4">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold dark:text-white">Conferente Pro</h1>
                </div>
            </header>
            <main className="max-w-3xl mx-auto pt-24 px-4">
                <WeighingForm onViewHistory={() => setActiveTab('history')} />
            </main>
        </div>
    );
};

const App = () => (
    <LanguageProvider>
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    </LanguageProvider>
);

export default App;