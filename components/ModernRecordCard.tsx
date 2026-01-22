import React from 'react';
import { WeighingRecord } from '../types';
import { createPortal } from 'react-dom';

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
    const [showImageModal, setShowImageModal] = React.useState(false);

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowImageModal(true);
    };

    const diff = record.netWeight - record.noteWeight;
    const isError = Math.abs(diff) > TOLERANCE_KG;
    const statusColor = isError ? 'red' : 'emerald';

    return (
        <>
            <div
                className="glass-dark rounded-3xl overflow-hidden card-shadow-lg transition-all duration-500 hover:scale-[1.01] animate-ios-slide active:scale-[0.98]"
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
                            <div
                                className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-zoom-in group relative"
                                onClick={handleImageClick}
                            >
                                <img src={record.evidence} alt="Evidencia" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="material-icons-round text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm">zoom_in</span>
                                </div>
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
                        <div className="bg-white/5 rounded-2xl p-2 text-center border border-white/5">
                            <p className="text-[8px] text-zinc-500 font-black uppercase mb-0.5 tracking-wider">Tara ({record.boxes.qty})</p>
                            <p className="text-xs font-bold text-zinc-300 font-mono">{record.taraTotal.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-2 text-center border border-white/5">
                            <p className="text-[8px] text-zinc-500 font-black uppercase mb-0.5 tracking-wider">Bruto</p>
                            <p className="text-xs font-bold text-zinc-300 font-mono">{record.grossWeight.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-2 text-center border border-white/10">
                            <p className="text-[8px] text-zinc-400 font-black uppercase mb-0.5 tracking-wider">Líquido</p>
                            <p className="text-sm font-black text-white font-mono">{record.netWeight.toFixed(2)}</p>
                        </div>
                        <div className={`rounded-2xl p-2 text-center border ${isError ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <p className={`text-[8px] font-black uppercase mb-0.5 tracking-wider ${isError ? 'text-red-400' : 'text-emerald-400'}`}>Dif.</p>
                            <p className={`text-sm font-black font-mono ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                        <div className="space-y-3 pt-4 border-t border-white/5 animate-ios-fade">
                            {/* Logistics info */}
                            {(record.batch || record.expirationDate || record.recommendedTemperature) && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <p className="text-[9px] text-blue-400 font-black uppercase mb-3 tracking-widest">
                                        Detalles de Envío
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
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

                {/* Full Screen Image Modal */}
                {showImageModal && createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4"
                        onClick={() => setShowImageModal(false)}
                    >
                        <div className="relative max-w-full max-h-full flex items-center justify-center">
                            <img
                                src={record.evidence}
                                alt="Evidencia Full"
                                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-scale-in"
                            />
                            <button
                                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowImageModal(false);
                                }}
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
};
