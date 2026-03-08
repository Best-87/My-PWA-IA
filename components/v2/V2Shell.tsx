
import React, { useState } from 'react';
import { DashboardV2 } from './DashboardV2';
import { WeighingFormV2 } from './WeighingFormV2';
import { AnalyticsView } from './AnalyticsView';
import { BottomNavV2 } from './BottomNavV2';
import { UserProfile, WeighingRecord } from '../../types';
import { ProfileView } from '../ProfileView';

interface V2ShellProps {
    records: WeighingRecord[];
    profile: UserProfile;
    onRecordSaved: () => void;
    // ... other props from App.tsx as needed
}

export const V2Shell: React.FC<any> = (props) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'weigh' | 'history' | 'analytics' | 'profile'>('dashboard');

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-['Inter',sans-serif] pb-32">
            {/* V2 Header */}
            <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-[#020617]/80 backdrop-blur-xl z-40">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Conferente Pro</span>
                    <span className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">
                        {activeTab === 'dashboard' ? 'Início' :
                            activeTab === 'weigh' ? 'Conferência' :
                                activeTab === 'history' ? 'Histórico' :
                                    activeTab === 'analytics' ? 'Análises' : 'Meu Perfil'}
                    </span>
                </div>
                {activeTab !== 'profile' && (
                    <button onClick={() => setActiveTab('profile')} className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <Settings className="w-5 h-5 text-zinc-400" />
                    </button>
                )}
            </header>

            <main className="px-6 pt-4 max-w-xl mx-auto">
                {activeTab === 'dashboard' && <DashboardV2 records={props.records} profile={props.profile} onTabChange={setActiveTab} />}
                {activeTab === 'weigh' && <WeighingFormV2 onRecordSaved={props.onRecordSaved} onViewHistory={() => setActiveTab('history')} />}
                {activeTab === 'history' && <div className="animate-fade-in-up">{/* Use existing logic or V2 list props.children */} {props.historyContent} </div>}
                {activeTab === 'analytics' && <AnalyticsView records={props.records} />}
                {activeTab === 'profile' && <div className="animate-fade-in-up">{props.profileContent}</div>}
            </main>

            <BottomNavV2 activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

const Settings = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
