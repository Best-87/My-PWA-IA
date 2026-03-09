
import React, { useState } from 'react';
import { DashboardV2 } from './DashboardV2';
import { WeighingFormV2 } from './WeighingFormV2';
import { AnalyticsView } from './AnalyticsView';
import { UserProfile, WeighingRecord } from '../../types';
import { ArrowLeft, User } from 'lucide-react';

export const V2Shell: React.FC<any> = (props) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'weigh' | 'history' | 'analytics' | 'profile'>('dashboard');

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-['Inter',sans-serif]">
            {/* V2 Header */}
            <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-[#020617]/80 backdrop-blur-xl z-40">
                <div className="flex items-center gap-4">
                    {activeTab !== 'dashboard' && (
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className="p-2.5 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 active:scale-90 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-900 dark:text-white" />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Conferente Pro</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">
                            {activeTab === 'dashboard' ? 'Início' :
                                activeTab === 'weigh' ? 'Conferência' :
                                    activeTab === 'history' ? 'Histórico' :
                                        activeTab === 'analytics' ? 'Análises' : 'Meu Perfil'}
                        </span>
                    </div>
                </div>

                {activeTab !== 'profile' && (
                    <button
                        onClick={() => setActiveTab('profile')}
                        className="flex items-center gap-3 p-1 pr-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 active:scale-95 transition-all"
                    >
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                            {props.profile.photo ? (
                                <img src={props.profile.photo} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <User className="w-5 h-5 text-zinc-400" />
                            )}
                        </div>
                        {activeTab === 'dashboard' && (
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Perfil</span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white truncate max-w-[80px] uppercase">
                                    {props.profile.name.split(' ')[0]}
                                </span>
                            </div>
                        )}
                    </button>
                )}
            </header>

            <main className="px-6 pt-4 pb-8 max-w-xl mx-auto">
                {activeTab === 'dashboard' && <DashboardV2 records={props.records} profile={props.profile} onTabChange={setActiveTab} />}
                {activeTab === 'weigh' && <WeighingFormV2 onRecordSaved={props.onRecordSaved} onViewHistory={() => setActiveTab('history')} />}
                {activeTab === 'history' && <div className="animate-fade-in-up">{props.historyContent} </div>}
                {activeTab === 'analytics' && <AnalyticsView records={props.records} />}
                {activeTab === 'profile' && <div className="animate-fade-in-up">{props.profileContent}</div>}
            </main>
        </div>
    );
};

