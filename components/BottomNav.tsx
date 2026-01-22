import React from 'react';

interface BottomNavProps {
    activeTab: 'weigh' | 'history' | 'profile';
    onTabChange: (tab: 'weigh' | 'history' | 'profile') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'weigh' as const, icon: 'scale', label: 'Pesar' },
        { id: 'history' as const, icon: 'history', label: 'Historial' },
        { id: 'profile' as const, icon: 'person', label: 'Perfil' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
            <div className="glass dark:glass-dark border-t border-zinc-200/50 dark:border-zinc-800/50">
                <div className="max-w-3xl mx-auto px-2 py-2">
                    <div className="flex items-center justify-around">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className="flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all duration-300 btn-press relative group"
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-2xl animate-bounce-in" />
                                    )}

                                    {/* Icon */}
                                    <div className={`relative transition-all duration-300 ${isActive
                                        ? 'scale-110'
                                        : 'scale-100 group-hover:scale-105'
                                        }`}>
                                        <span className={`material-icons-round text-2xl transition-colors duration-300 ${isActive
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-zinc-400 dark:text-zinc-500'
                                            }`}>
                                            {tab.icon}
                                        </span>

                                        {/* Glow effect on active */}
                                        {isActive && (
                                            <div className="absolute inset-0 blur-lg bg-blue-500/30 dark:bg-blue-400/30 -z-10 animate-pulse-glow" />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className={`text-[10px] font-bold transition-all duration-300 ${isActive
                                        ? 'text-blue-600 dark:text-blue-400 scale-100'
                                        : 'text-zinc-500 dark:text-zinc-400 scale-95'
                                        }`}>
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
};
