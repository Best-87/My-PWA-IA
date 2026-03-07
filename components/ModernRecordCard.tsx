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
                className={`bg-white dark:bg-zinc-900 border-2 rounded transition-all duration-300 mb-4 cursor-pointer ${isExpanded ? 'border-zinc-800 dark:border-zinc-400 shadow-md scale-[1.01]' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'}`}
                onClick={onExpand}
            >
                <div className="p-4 relative z-10">
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            {/* Icon Box */}
                            <div className={`w-12 h-12 rounded border-2 flex items-center justify-center transition-colors duration-300 ${isError ? 'bg-red-100 text-red-600 border-red-500' : 'bg-emerald-100 text-emerald-600 border-emerald-500'}`}>
                                <span className="material-icons-round text-2xl">{isError ? 'warning' : 'verified'}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight uppercase line-clamp-1">
                                    {formattedProduct}
                                </h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 line-clamp-1">{record.supplier}</p>
                            </div>
                        </div>
                        {/* Date Badge */}
                        <div className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                {new Date(record.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </span>
                        </div>
                    </div>

                    {/* Hero Metrics */}
                    {!isExpanded && (
                        <div className="flex items-end justify-between animate-fade-in border-t-2 border-zinc-100 dark:border-zinc-800 pt-3">
                            <div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">NETO (KG)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">{record.netWeight.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className={`flex flex-col items-end ${isError ? 'text-red-600' : 'text-emerald-600'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-widest mb-1">{isError ? 'DIFERENCIA' : 'EXACTO'}</span>
                                <span className="text-lg font-mono font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border-2 border-transparent">{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                        <div className="animate-fade-in space-y-4 mt-4 border-t-2 border-zinc-200 dark:border-zinc-700 pt-4">
                            {/* Weights Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded border-2 border-zinc-200 dark:border-zinc-700 p-2 text-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">NETO(KG)</span>
                                    <span className="text-xl font-mono font-bold text-zinc-900 dark:text-white">{record.netWeight.toFixed(2)}</span>
                                </div>
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded border-2 border-zinc-200 dark:border-zinc-700 p-2 text-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">BRUTO(KG)</span>
                                    <span className="text-lg font-mono font-bold text-zinc-700 dark:text-zinc-300">{record.grossWeight.toFixed(2)}</span>
                                </div>
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded border-2 border-zinc-200 dark:border-zinc-700 p-2 text-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">TARA(KG)</span>
                                    <span className="text-lg font-mono font-bold text-zinc-700 dark:text-zinc-300">{record.taraTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Difference Detail Box */}
                            <div className={`p-3 rounded border-2 flex items-center justify-between ${isError ? 'bg-red-50 border-red-500 text-red-900' : 'bg-emerald-50 border-emerald-500 text-emerald-900'}`}>
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
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">LOGÍSTICA</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Batch */}
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border-2 border-zinc-200 dark:border-zinc-700">
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">LOTE</span>
                                        <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">{record.batch || 'N/A'}</span>
                                    </div>
                                    {/* Expiration */}
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border-2 border-zinc-200 dark:border-zinc-700">
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">VENCIMIENTO</span>
                                        <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">{record.expirationDate || 'N/A'}</span>
                                    </div>
                                    {/* Production */}
                                    {record.productionDate && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border-2 border-zinc-200 dark:border-zinc-700">
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">FABRICACIÓN</span>
                                            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">{record.productionDate}</span>
                                        </div>
                                    )}
                                    {/* Temp */}
                                    {record.recommendedTemperature && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border-2 border-zinc-200 dark:border-zinc-700">
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">TEMP REC.</span>
                                            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">{record.recommendedTemperature}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Evidence Image */}
                            {record.evidence && (
                                <div className="space-y-2 mt-2">
                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">EVIDENCIA VISUAL</h4>
                                    <div className="relative h-40 rounded border-4 border-zinc-200 dark:border-zinc-700 overflow-hidden cursor-pointer" onClick={handleImageClick}>
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
                                <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded border-2 border-purple-400 dark:border-purple-600 mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-icons-round text-purple-600 text-lg">auto_awesome</span>
                                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest">ANÁLISIS IA</span>
                                    </div>
                                    <p className="text-xs text-purple-900 dark:text-purple-100 leading-relaxed font-bold">{record.aiAnalysis}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-4 gap-2 pt-4 border-t-2 border-zinc-200 dark:border-zinc-700 mt-2">
                                <button
                                    onClick={onShare}
                                    className="col-span-3 h-12 rounded bg-blue-600 text-white font-bold text-xs uppercase tracking-widest border-2 border-blue-800 active:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-round text-lg">share</span>
                                    COMPARTIR
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="col-span-1 h-12 rounded bg-red-600 text-white flex items-center justify-center active:bg-red-700 border-2 border-red-800"
                                >
                                    <span className="material-icons-round text-lg">delete</span>
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
                            className="max-w-full max-h-[85vh] object-contain rounded border-4 border-zinc-500 bg-zinc-900 animate-scale-in"
                        />

                        <div className="mt-6 flex gap-4 w-full max-w-sm">
                            <button
                                onClick={onShare}
                                className="w-full py-4 bg-blue-600 rounded text-white font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-blue-800 active:bg-blue-700"
                            >
                                <span className="material-icons-round text-lg">share</span> COMPARTIR
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
