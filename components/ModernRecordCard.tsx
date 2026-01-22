import React from 'react';
import { WeighingRecord } from '../types';

interface ModernRecordCardProps {
    record: WeighingRecord;
    onExpand: () => void;
    onDelete: (e: React.MouseEvent) => void;
    onShare: (e: React.MouseEvent) => void;
    isExpanded: boolean;
}

const TOLERANCE_KG = 0.2;

export const ModernRecordCard: React.FC<ModernRecordCardProps> = ({
    record,
    onExpand,
    onDelete,
    onShare,
    isExpanded
}) => {
    const diff = record.netWeight - record.noteWeight;
    const isError = Math.abs(diff) > TOLERANCE_KG;
    const statusColor = isError ? 'red' : 'emerald';

    return (
        <div
            className="glass dark:glass-dark rounded-3xl overflow-hidden card-shadow-lg transition-all duration-300 hover:scale-[1.02] animate-slide-up-fade"
        >

            {/* Main content */}
            <div
                onClick={onExpand}
                className="p-5 cursor-pointer"
            >
                {/* Header */}
                <div className="flex gap-4 mb-4">
                    {/* Image Thumbnail - Restored */}
                    {record.evidence && (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            <img src={record.evidence} alt="Evidencia" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'} shadow-sm`}></span>
                                    {record.product}
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium line-clamp-1">
                                    {record.supplier}
                                </p>
                            </div>
                            {/* Time badge */}
                            <div className="flex flex-col items-end gap-1 ml-2">
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold">
                                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isError
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                    {isError ? 'REVISAR' : 'OK'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid - Expanded to include detailed info */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-2 text-center">
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase mb-0.5">Tara ({record.boxes.qty})</p>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">{record.taraTotal.toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-2 text-center">
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase mb-0.5">Bruto</p>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">{record.grossWeight.toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-2 text-center border border-zinc-200 dark:border-zinc-700">
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-black uppercase mb-0.5">Líquido</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-white font-mono">{record.netWeight.toFixed(2)}</p>
                    </div>
                    <div className={`rounded-xl p-2 text-center border ${isError ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'}`}>
                        <p className={`text-[9px] font-black uppercase mb-0.5 ${isError ? 'text-red-400' : 'text-emerald-400'}`}>Dif.</p>
                        <p className={`text-sm font-black font-mono ${isError ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                    <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 animate-slide-up-fade">
                        {/* Logistics info */}
                        {(record.batch || record.expirationDate || record.recommendedTemperature) && (
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mb-2 tracking-wide">
                                    Datos Logísticos
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {record.batch && (
                                        <div className="text-xs">
                                            <span className="text-zinc-400 font-semibold block text-[10px] uppercase">Lote</span>
                                            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-200">{record.batch}</span>
                                        </div>
                                    )}
                                    {record.expirationDate && (
                                        <div className="text-xs">
                                            <span className="text-zinc-400 font-semibold block text-[10px] uppercase">Vence</span>
                                            <span className="font-bold text-zinc-700 dark:text-zinc-200">{record.expirationDate}</span>
                                        </div>
                                    )}
                                    {record.recommendedTemperature && (
                                        <div className="text-xs col-span-2">
                                            <span className="text-zinc-400 font-semibold block text-[10px] uppercase">Temperatura Ideal</span>
                                            <span className="font-bold text-zinc-700 dark:text-zinc-200">{record.recommendedTemperature}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Analysis */}
                        {record.aiAnalysis && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-icons-round text-sm text-purple-600 dark:text-purple-400">
                                        smart_toy
                                    </span>
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">
                                        Análisis IA
                                    </p>
                                </div>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                    {record.aiAnalysis}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={onShare}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 btn-press"
                            >
                                <span className="material-icons-round text-base">share</span>
                                Compartir
                            </button>
                            <button
                                onClick={onDelete}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-2xl btn-press"
                            >
                                <span className="material-icons-round text-base">delete</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
