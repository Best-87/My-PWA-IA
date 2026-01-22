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
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'} shadow-sm`}></span>
                            {record.product}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                            {record.supplier}
                        </p>
                    </div>

                    {/* Time badge */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                            {new Date(record.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isError
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            }`}>
                            {isError ? 'Revisar' : 'OK'}
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-3">
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mb-1">
                            Bruto
                        </p>
                        <p className="text-base font-bold text-zinc-900 dark:text-white font-mono">
                            {record.grossWeight.toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-3">
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mb-1">
                            Líquido
                        </p>
                        <p className="text-base font-bold text-zinc-900 dark:text-white font-mono">
                            {record.netWeight.toFixed(2)}
                        </p>
                    </div>

                    <div className={`rounded-2xl p-3 ${isError
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-emerald-50 dark:bg-emerald-900/20'
                        }`}>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mb-1">
                            Dif.
                        </p>
                        <p className={`text-base font-bold font-mono ${isError
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                    <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 animate-slide-up-fade">
                        {/* Logistics info */}
                        {(record.batch || record.expirationDate) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3">
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-2">
                                    Datos Logísticos
                                </p>
                                <div className="space-y-1">
                                    {record.batch && (
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            <span className="text-zinc-500 dark:text-zinc-400">Lote:</span>{' '}
                                            <span className="font-mono font-bold">{record.batch}</span>
                                        </p>
                                    )}
                                    {record.expirationDate && (
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            <span className="text-zinc-500 dark:text-zinc-400">Vence:</span>{' '}
                                            <span className="font-bold">{record.expirationDate}</span>
                                        </p>
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
