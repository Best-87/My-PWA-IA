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
        <nav className="fixed bottom-6 left-4 right-4 z-50 safe-bottom">
            <div className="max-w-md mx-auto">
                <div className="glass-dark rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] px-2 py-2 animate-ios-spring">
                    <div className="flex items-center justify-around">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className="flex flex-col items-center gap-1 px-5 py-2 rounded-[2rem] transition-all duration-300 btn-press relative group"
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute inset-x-2 inset-y-1 bg-white/10 rounded-[1.5rem] animate-ios-fade" />
                                    )}

                                    {/* Icon */}
                                    <div className={`relative transition-all duration-500 ${isActive
                                        ? 'scale-110 -translate-y-0.5'
                                        : 'scale-100 group-hover:scale-105'
                                        }`}>
                                        <span className={`material-icons-round text-2xl transition-all duration-300 ${isActive
                                            ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                                            : 'text-zinc-500'
                                            }`}>
                                            {tab.icon}
                                        </span>
                                    </div>

                                    {/* Label */}
                                    <span className={`text-[9px] font-black uppercase tracking-[0.05em] transition-all duration-300 ${isActive
                                        ? 'text-white opacity-100'
                                        : 'text-zinc-500 opacity-60'
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
