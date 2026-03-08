
import React from 'react';
import { Scale, History, User, LayoutDashboard, BarChart3, Zap } from 'lucide-react';

interface BottomNavV2Props {
    activeTab: 'dashboard' | 'weigh' | 'history' | 'analytics' | 'profile';
    onTabChange: (tab: 'dashboard' | 'weigh' | 'history' | 'analytics' | 'profile') => void;
}

export const BottomNavV2: React.FC<BottomNavV2Props> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Início' },
        { id: 'weigh' as const, icon: Scale, label: 'Pesar' },
        { id: 'history' as const, icon: History, label: 'Histórico' },
        { id: 'analytics' as const, icon: BarChart3, label: 'Análises' },
        { id: 'profile' as const, icon: User, label: 'Perfil' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)] px-4 pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <div className="max-w-xl mx-auto flex items-center justify-between h-16">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative group`}
                        >
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full shadow-[0_0_12px_rgba(37,99,235,0.4)] animate-fade-in"></div>
                            )}

                            <div className={`flex items-center justify-center mb-1 transition-transform ${isActive ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-110'}`}>
                                <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-blue-600' : 'text-zinc-400 dark:text-zinc-600'}`} strokeWidth={isActive ? 2.5 : 2} />
                            </div>

                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-700'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
