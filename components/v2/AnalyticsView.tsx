
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
    Activity, CheckCircle2, AlertCircle, FileText,
    TrendingUp, BarChart2, PieChart as PieChartIcon, LayoutDashboard
} from 'lucide-react';
import { WeighingRecord } from '../../types';

interface AnalyticsViewProps {
    records: WeighingRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records }) => {
    // Statistics
    const stats = useMemo(() => {
        const total = records.length;
        const ok = records.filter(r => Math.abs(r.netWeight - r.noteWeight) <= 0.2).length;
        const errors = records.filter(r => Math.abs(r.netWeight - r.noteWeight) > 0.2).length;
        const pending = records.filter(r => r.status === 'pending').length;

        return { total, ok, errors, pending };
    }, [records]);

    // Status Distribution (Pie Data)
    const pieData = useMemo(() => [
        { name: 'Aprobadas', value: stats.ok, color: '#10b981' },
        { name: 'Divergencias', value: stats.errors, color: '#ef4444' },
        { name: 'Pendientes', value: stats.pending, color: '#f59e0b' },
    ].filter(d => d.value > 0), [stats]);

    // Weight Evolution (Line Data) - Last 10 records
    const lineData = useMemo(() => {
        return records
            .slice(-10)
            .map(r => ({
                timestamp: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                Bruto: r.grossWeight,
                Liquido: r.netWeight,
                Nota: r.noteWeight,
            }));
    }, [records]);

    // Metrics Comparison (Bar Data) - Last 5 records
    const barData = useMemo(() => {
        return records
            .slice(-5)
            .map(r => ({
                name: r.product.substring(0, 8),
                Liquido: r.netWeight,
                Nota: r.noteWeight,
            }));
    }, [records]);

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <Activity className="w-12 h-12 text-zinc-300 mb-4" />
                <p className="text-zinc-500 font-medium">Realize algumas conferências para ver as análises.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Real-time Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Activity className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.total}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Aprovadas</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{stats.ok}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Critério</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">{stats.errors}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Taxa Êxito</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                        {Math.round((stats.ok / stats.total) * 100)}%
                    </p>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" /> Distribuição de Status
                </h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="bottom" iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Evolution Chart */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Evolução do Peso (Diferença)
                </h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="timestamp" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line type="monotone" dataKey="Liquido" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="Nota" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Comparison Chart */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" /> Líquido vs Objetivo
                </h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="Liquido" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Nota" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
