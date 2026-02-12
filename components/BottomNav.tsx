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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-white/5 pb-[env(safe-area-inset-bottom)] px-6 pt-2 animate-ios-fade">
            <div className="max-w-lg mx-auto flex items-center justify-around">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const isProfile = tab.id === 'profile';

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className="flex flex-col items-center gap-1 py-2 px-4 transition-all duration-300 relative group"
                        >
                            {/* Icon Container with subtle glow when active */}
                            <div className={`relative w-12 h-8 flex items-center justify-center transition-all duration-500`}>
                                {isActive && (
                                    <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full animate-ios-fade" />
                                )}

                                {isProfile && profilePhoto ? (
                                    <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-blue-500 scale-110' : 'border-zinc-200 dark:border-zinc-700'}`}>
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <span className={`material-icons-round text-2xl transition-all duration-300 ${isActive
                                        ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                        : 'text-zinc-400 dark:text-zinc-600'
                                        }`}>
                                        {tab.icon}
                                    </span>
                                )}
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${isActive
                                ? 'text-blue-500'
                                : 'text-zinc-400 dark:text-zinc-600'
                                }`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
