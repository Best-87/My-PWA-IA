
import React from 'react';
import {
    Plus, History, BarChart2, User, Zap, ArrowRight,
    CheckCircle2, AlertCircle, Clock, TrendingUp,
    Scan, Camera, FileText
} from 'lucide-react';
import { WeighingRecord, UserProfile } from '../../types';

interface DashboardV2Props {
    records: WeighingRecord[];
    profile: UserProfile;
    onTabChange: (tab: any) => void;
}

export const DashboardV2: React.FC<DashboardV2Props> = ({ records, profile, onTabChange }) => {
    const stats = React.useMemo(() => {
        const today = new Date().toDateString();
        const todayRecords = records.filter(r => new Date(r.timestamp).toDateString() === today);
        const ok = todayRecords.filter(r => Math.abs(r.netWeight - r.noteWeight) <= 0.2).length;
        const errors = todayRecords.length - ok;

        return {
            todayCount: todayRecords.length,
            ok,
            errors,
            recent: [...records].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 3)
        };
    }, [records]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Olá, {profile.name.split(' ')[0]} 👋</h1>
                    <p className="text-sm text-zinc-500 font-medium">Pronto para conferir as cargas de hoje?</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                    {profile.photo ? (
                        <img src={profile.photo} className="w-full h-full object-cover" />
                    ) : (
                        <User className="text-zinc-400" />
                    )}
                </div>
            </div>

            {/* Main Action Card */}
            <button
                onClick={() => onTabChange('weigh')}
                className="w-full p-6 bg-zinc-900 dark:bg-white rounded-[2.5rem] text-white dark:text-black shadow-2xl shadow-zinc-900/20 flex flex-col items-start gap-4 relative overflow-hidden group active:scale-95 transition-all"
            >
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 dark:bg-black/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="p-3 bg-white/20 dark:bg-zinc-100 rounded-2xl backdrop-blur-md">
                    <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                    <span className="text-lg font-black block">Nova Conferência</span>
                    <span className="text-xs opacity-60 font-medium block">Pesar cargas, scanner de notas e IA</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 dark:bg-black/5 rounded-full backdrop-blur-sm border border-white/10 text-[10px] font-black uppercase tracking-widest">
                    Iniciar Agora <ArrowRight className="w-3 h-3 ml-1" />
                </div>
            </button>

            {/* Status Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                    <span className="text-lg font-black text-zinc-900 dark:text-white block">{stats.todayCount}</span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Hoje</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 shadow-sm text-center">
                    <span className="text-lg font-black text-emerald-600 block">{stats.ok}</span>
                    <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">OK</span>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-3xl border border-red-100 dark:border-red-900/20 shadow-sm text-center">
                    <span className="text-lg font-black text-red-600 block">{stats.errors}</span>
                    <span className="text-[9px] font-black text-red-600/60 uppercase tracking-widest">Diverg.</span>
                </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onTabChange('history')}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-4 hover:-translate-y-1 transition-all group"
                >
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <History className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-black text-zinc-900 dark:text-white block">Histórico</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-black">Registros</span>
                    </div>
                </button>

                <button
                    onClick={() => onTabChange('analytics')}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-4 hover:-translate-y-1 transition-all group"
                >
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <BarChart2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-black text-zinc-900 dark:text-white block">Análises</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-black">Estatísticas</span>
                    </div>
                </button>
            </div>

            {/* Recent Activity List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Atividades Recentes</h3>
                    <button onClick={() => onTabChange('history')} className="text-[10px] font-black uppercase tracking-widest text-blue-600">Ver Tudo</button>
                </div>

                <div className="space-y-3 pb-20">
                    {stats.recent.map((rec) => (
                        <button
                            key={rec.id}
                            onClick={() => onTabChange('history')}
                            className="w-full bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group active:scale-95 transition-all cursor-pointer text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${Math.abs((rec.netWeight || 0) - (rec.noteWeight || 0)) <= 0.2 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {Math.abs((rec.netWeight || 0) - (rec.noteWeight || 0)) <= 0.2 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs font-black text-zinc-900 dark:text-white block uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">{rec.product}</span>
                                    <span className="text-[10px] text-zinc-400 font-medium block truncate max-w-[120px] sm:max-w-none">{rec.supplier}</span>
                                </div>
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <span className="text-xs font-black text-zinc-900 dark:text-white block">{(rec.netWeight || 0).toFixed(3)} KG</span>
                                <span className="text-[9px] text-zinc-400 font-medium block uppercase tracking-widest">{new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </button>
                    ))}

                    {stats.recent.length === 0 && (
                        <div className="py-10 text-center opacity-40">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma atividade hoje</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
