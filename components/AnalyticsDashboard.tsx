import React, { useEffect, useState } from 'react';
import { getStats, getEvents } from '../services/analyticsService';
import { UserStats, AnalyticsEvent } from '../types';

interface AnalyticsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose }) => {
    const [stats, setStats] = useState<UserStats>(getStats());
    const [events, setEvents] = useState<AnalyticsEvent[]>(getEvents());

    useEffect(() => {
        if (isOpen) {
            setStats(getStats());
            setEvents(getEvents());
        }
    }, [isOpen]);

    useEffect(() => {
        const handleUpdate = () => {
            if (isOpen) {
                setStats(getStats());
                setEvents(getEvents());
            }
        };

        window.addEventListener('analytics_updated', handleUpdate);
        return () => window.removeEventListener('analytics_updated', handleUpdate);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#1e1e1e] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-white font-bold flex items-center gap-3 text-lg">
                        <span className="text-2xl">📊</span> Panel de Datos
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5">
                    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1">Sesiones</p>
                        <p className="text-3xl font-mono text-blue-400 font-bold">{stats.totalSessions}</p>
                    </div>
                    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1">Estado PWA</p>
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg mt-1 ${stats.isInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            <span className="material-icons-round text-sm">{stats.isInstalled ? 'verified' : 'open_in_browser'}</span>
                            <span className="text-xs font-bold">{stats.isInstalled ? 'NATIVA' : 'WEB'}</span>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] p-4 rounded-2xl border border-white/5 col-span-2 md:col-span-1">
                        <p className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1">Última Visita</p>
                        <p className="text-sm text-white/90 font-medium mt-1">
                            {new Date(stats.lastVisit).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-white/50 font-mono">
                            {new Date(stats.lastVisit).toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {/* Event Log */}
                <div className="flex-1 overflow-y-auto p-5 border-t border-white/10 bg-black/20">
                    <h3 className="text-xs font-black text-white/30 mb-4 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-icons-round text-sm">history</span> Log de Eventos
                    </h3>
                    <div className="space-y-3">
                        {events.map((event, idx) => (
                            <div key={idx} className="flex gap-4 text-xs font-mono p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                                <span className="text-white/30 whitespace-nowrap pt-0.5">
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-primary-300 font-bold mb-1 truncate">{event.eventName}</div>
                                    {event.properties && (
                                        <div className="text-white/40 break-all leading-relaxed">
                                            {JSON.stringify(event.properties)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div className="text-center py-10 opacity-30">
                                <span className="material-icons-round text-4xl mb-2">event_busy</span>
                                <p className="text-sm">Sin actividad registrada</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};