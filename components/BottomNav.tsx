import React from 'react';

interface BottomNavProps {
    activeTab: 'weigh' | 'history' | 'profile';
    onTabChange: (tab: 'weigh' | 'history' | 'profile') => void;
    children?: React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, children }) => {
    const tabs = [
        { id: 'weigh' as const, icon: 'scale', label: 'Pesar' },
        { id: 'history' as const, icon: 'history', label: 'Historial' },
        { id: 'profile' as const, icon: 'person', label: 'Perfil' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
            <div className="max-w-lg mx-auto flex flex-col items-center gap-3 pointer-events-auto">
                {/* Contextual Actions (Top of the island) */}
                {children && (
                    <div className="w-full flex justify-center animate-ios-spring">
                        {children}
                    </div>
                )}

                {/* Main Navigation Tab (Bottom of the island) - Reduced width to feel like an island */}
                <div className="glass dark:glass-dark rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] px-1.5 py-1.5 animate-ios-spring min-w-[320px]">
                    <div className="flex items-center justify-around gap-1">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-[2rem] transition-all duration-300 btn-press relative group min-w-[80px]"
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute inset-x-1 inset-y-1 bg-zinc-900/5 dark:bg-white/10 rounded-[1.5rem] animate-ios-fade" />
                                    )}

                                    {/* Icon */}
                                    <div className={`relative transition-all duration-500 ${isActive
                                        ? 'scale-110 -translate-y-0.5'
                                        : 'scale-100 group-hover:scale-105'
                                        }`}>
                                        <span className={`material-icons-round text-[22px] transition-all duration-300 ${isActive
                                            ? 'text-zinc-900 dark:text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                                            : 'text-zinc-400 dark:text-zinc-500'
                                            }`}>
                                            {tab.icon}
                                        </span>
                                    </div>

                                    {/* Label */}
                                    <span className={`text-[8px] font-black uppercase tracking-[0.08em] transition-all duration-300 ${isActive
                                        ? 'text-zinc-900 dark:text-white opacity-100'
                                        : 'text-zinc-500 dark:text-zinc-500 opacity-60'
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
