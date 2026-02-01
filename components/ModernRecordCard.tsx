import React, { useState } from 'react';
import { WeighingRecord } from '../types';
import { createPortal } from 'react-dom';
import { useTranslation } from '../services/i18n';

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
    const { t } = useTranslation();
    const [showImageModal, setShowImageModal] = useState(false);

    const reformatProductName = (name: string): string => {
        if (!name) return '';
        const match = name.match(/\(([^)]+)\)/);
        if (match) {
            const parenthesized = match[0];
            const rest = name.replace(parenthesized, '').trim();
            return `${parenthesized} ${rest}`;
        }
        return name;
    };

    const formattedProduct = reformatProductName(record.product);

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowImageModal(true);
    };

    const diff = record.netWeight - record.noteWeight;
    const isError = Math.abs(diff) > TOLERANCE_KG;

    return (
        <>
            <div
                className={`glass-premium rounded-[2.5rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-purple-500/20 shadow-2xl scale-[1.02]' : 'hover:scale-[1.01]'} mb-6 relative group`}
                onClick={onExpand}
            >
                <div className="p-6 relative z-10">
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            {/* Icon Box */}
                            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-inner transition-colors duration-300 ${isError ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-500 dark:bg-green-900/20 dark:text-green-400'}`}>
                                <span className="material-icons-round text-3xl">{isError ? 'warning' : 'verified'}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-zinc-800 dark:text-white leading-tight line-clamp-1">
                                    {formattedProduct}
                                </h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 line-clamp-1">{record.supplier}</p>
                            </div>
                        </div>
                        {/* Date Badge */}
                        <div className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                {new Date(record.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </span>
                        </div>
                    </div>

                    {/* Hero Metrics (Always visible in collapsed state, shown differently in expanded) */}
                    {!isExpanded && (
                        <div className="flex items-end justify-between animate-fade-in">
                            <div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{t('lbl_net')}</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-zinc-800 dark:text-white tracking-tight">{record.netWeight.toFixed(2)}</span>
                                    <span className="text-xs font-bold text-zinc-400">kg</span>
                                </div>
                            </div>
                            <div className={`flex flex-col items-end ${isError ? 'text-red-500' : 'text-emerald-500'}`}>
                                <span className="text-[10px] font-black uppercase tracking-widest mb-1">{isError ? 'Diferencia' : 'Exacto'}</span>
                                <span className="text-xl font-black">{diff > 0 ? '+' : ''}{diff.toFixed(2)} kg</span>
                            </div>
                        </div>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                        <div className="animate-fade-in space-y-6 mt-2">
                            {/* Weights Grid (Glass Inner) */}
                            <div className="grid grid-cols-3 gap-2 bg-zinc-50/50 dark:bg-black/20 rounded-3xl p-5 border border-zinc-100 dark:border-white/5">
                                <div className="text-center">
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Neto</span>
                                    <span className="text-2xl font-black text-zinc-800 dark:text-white">{record.netWeight.toFixed(2)}</span>
                                </div>
                                <div className="text-center border-l border-zinc-200/50 dark:border-white/10">
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Bruto</span>
                                    <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300">{record.grossWeight.toFixed(2)}</span>
                                </div>
                                <div className="text-center border-l border-zinc-200/50 dark:border-white/10">
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Tara</span>
                                    <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300">{record.taraTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Difference Detail Box */}
                            <div className={`p-4 rounded-2xl flex items-center justify-between ${isError ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30' : 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`material-icons-round ${isError ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {isError ? 'error_outline' : 'check_circle_outline'}
                                    </span>
                                    <div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest block ${isError ? 'text-red-400' : 'text-emerald-400'}`}>Comparativa</span>
                                        <span className={`text-sm font-bold ${isError ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                                            {isError ? (Math.abs(diff) + ' kg de diferencia detectada') : 'Peso nota coincidente'}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-xl font-black ${isError ? 'text-red-500' : 'text-emerald-500'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                            </div>

                            {/* Logistics Data (Grid) */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest px-1">Datos Logísticos</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Batch */}
                                    <div className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/20 dark:border-white/5">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Lote / Batch</span>
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.batch || 'N/A'}</span>
                                    </div>
                                    {/* Expiration */}
                                    <div className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/20 dark:border-white/5">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Vencimiento</span>
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.expirationDate || 'N/A'}</span>
                                    </div>
                                    {/* Production */}
                                    {record.productionDate && (
                                        <div className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/20 dark:border-white/5">
                                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Fabricación</span>
                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.productionDate}</span>
                                        </div>
                                    )}
                                    {/* Temp */}
                                    {record.recommendedTemperature && (
                                        <div className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/20 dark:border-white/5">
                                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Temperatura</span>
                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.recommendedTemperature}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Evidence Image */}
                            {record.evidence && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest px-1">Evidencia Visual</h4>
                                    <div className="relative h-48 rounded-[2rem] overflow-hidden group shadow-lg" onClick={handleImageClick}>
                                        <img src={record.evidence} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                                <span className="material-icons-round text-white">zoom_in</span>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                            <span className="material-icons-round text-white drop-shadow-md">photo_camera</span>
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">Imagen Capturada</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Analysis Text */}
                            {record.aiAnalysis && (
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-[2rem] border border-purple-100 dark:border-purple-800/20 shadow-inner">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-icons-round text-purple-500 text-lg">auto_awesome</span>
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Análisis IA</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">{record.aiAnalysis}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-white/5">
                                <button
                                    onClick={onShare}
                                    className="flex-1 h-14 rounded-[1.5rem] bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-xl dark:shadow-white/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-round text-xl">share</span>
                                    Compartir
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="w-14 h-14 rounded-[1.5rem] bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-95 transition-transform border border-red-100 dark:border-red-500/20"
                                >
                                    <span className="material-icons-round text-xl">delete</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Full Screen Image Modal */}
            {showImageModal && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 animate-fade-in"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-4 right-4 w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-white"
                            onClick={() => setShowImageModal(false)}
                        >
                            <span className="material-icons-round text-2xl">close</span>
                        </button>

                        <img
                            src={record.evidence}
                            alt="Evidencia Full"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-scale-in"
                        />

                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={onShare}
                                className="px-6 py-3 bg-blue-600 rounded-full text-white font-bold text-sm tracking-wide flex items-center gap-2 shadow-lg shadow-blue-600/30"
                            >
                                <span className="material-icons-round text-lg">share</span> Compartir Imagen
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
