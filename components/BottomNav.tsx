import React from 'react';

interface BottomNavProps {
    activeTab: 'weigh' | 'history' | 'profile' | 'quick';
    onTabChange: (tab: 'weigh' | 'history' | 'profile' | 'quick') => void;
    profilePhoto?: string | null;
    children?: React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, profilePhoto, children }) => {
    const tabs = [
        { id: 'weigh' as const, icon: 'scale', label: 'Pesar' },
        { id: 'quick' as const, icon: 'add_task', label: 'Rápido' },
        { id: 'history' as const, icon: 'history', label: 'Historial' },
        { id: 'profile' as const, icon: 'person', label: 'Perfil' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F2F5F8] dark:bg-[#121214] border-t-4 border-zinc-300 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)] px-0 pt-0 animate-ios-fade">
            <div className="max-w-lg mx-auto flex items-center justify-around h-16">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const isProfile = tab.id === 'profile';

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors relative border-b-4 ${isActive ? 'border-blue-600 bg-zinc-200 dark:bg-zinc-800' : 'border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            <div className="flex items-center justify-center mb-1">
                                {isProfile && profilePhoto ? (
                                    <div className={`w-6 h-6 rounded border-2 transition-colors ${isActive ? 'border-blue-600' : 'border-zinc-400 dark:border-zinc-600'} overflow-hidden`}>
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <span className={`material-icons-round text-2xl transition-colors ${isActive ? 'text-blue-600' : 'text-zinc-500'}`}>
                                        {tab.icon}
                                    </span>
                                )}
                            </div>

                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-500'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
