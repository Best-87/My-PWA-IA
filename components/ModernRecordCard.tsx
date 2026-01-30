import React from 'react';
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
    const [showImageModal, setShowImageModal] = React.useState(false);

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowImageModal(true);
    };

    const diff = record.netWeight - record.noteWeight;
    const isError = Math.abs(diff) > TOLERANCE_KG;

    return (
        <>
            <div
                className={`smart-card overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-500/20' : 'hover:scale-[1.01]'} active:scale-[0.98] mb-4`}
                onClick={onExpand}
            >
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isError ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                <span className="material-icons-round text-2xl">{isError ? 'priority_high' : 'check_circle'}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-zinc-800 dark:text-white line-clamp-1 uppercase tracking-tight">{record.product}</h3>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{record.supplier}</p>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                            <span className="text-[9px] text-zinc-300 font-black uppercase tracking-widest">
                                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className={`text-[8px] font-black px-2 py-0.5 rounded-full tracking-widest ${isError ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                                {isError ? 'ERROR' : 'VALIDADO'}
                            </div>
                        </div>
                    </div>

                    {/* Integrated Image if exists and not expanded */}
                    {!isExpanded && record.evidence && (
                        <div className="mb-4 rounded-2xl overflow-hidden h-32 relative border border-zinc-100 dark:border-white/5 shadow-sm" onClick={handleImageClick}>
                            <img src={record.evidence} alt="Evidence" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <span className="material-icons-round text-white text-sm">photo_camera</span>
                                <span className="text-[10px] text-white font-bold uppercase tracking-widest">Evidencia Visual</span>
                            </div>
                        </div>
                    )}

                    {/* Quick Metrics Grid */}
                    <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${isExpanded ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 flex items-center gap-3 border border-zinc-100/50 dark:border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm text-zinc-400">
                                <span className="material-icons-round text-xl">scale</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-zinc-400 uppercase block tracking-widest">{t('lbl_net')}</span>
                                <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums">{record.netWeight.toFixed(2)}<span className="text-[10px] font-bold opacity-40 ml-0.5 uppercase">kg</span></span>
                            </div>
                        </div>
                        <div className={`rounded-2xl p-4 flex items-center gap-3 border shadow-sm ${isError ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-500/20' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20'}`}>
                            <div className={`w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm ${isError ? 'text-red-500' : 'text-emerald-500'}`}>
                                <span className="material-icons-round text-xl">difference</span>
                            </div>
                            <div>
                                <span className={`text-[9px] font-black uppercase block tracking-widest ${isError ? 'text-red-400' : 'text-emerald-400'}`}>Dif.</span>
                                <span className={`text-base font-black tabular-nums ${isError ? 'text-red-500' : 'text-emerald-500'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed expanded content */}
                    {isExpanded && (
                        <div className="space-y-4 pt-5 border-t border-zinc-100 dark:border-white/5 animate-ios-fade mt-5">
                            {/* Detailed Weights */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Bruto</span>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.grossWeight.toFixed(2)}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Nota</span>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.noteWeight.toFixed(2)}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Tara</span>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{record.taraTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Info Tiles */}
                            <div className="bg-zinc-50 dark:bg-white/5 rounded-[1.5rem] p-5 border border-white/5 space-y-4 shadow-inner">
                                <div className="grid grid-cols-2 gap-4">
                                    {record.batch && (
                                        <div className="flex items-center gap-3">
                                            <span className="material-icons-round text-zinc-400 text-lg">tag</span>
                                            <div>
                                                <span className="text-[8px] text-zinc-400 font-black uppercase block tracking-widest">Lote</span>
                                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{record.batch}</span>
                                            </div>
                                        </div>
                                    )}
                                    {record.expirationDate && (
                                        <div className="flex items-center gap-3">
                                            <span className="material-icons-round text-orange-400 text-lg">event_busy</span>
                                            <div>
                                                <span className="text-[8px] text-zinc-400 font-black uppercase block tracking-widest">Vence</span>
                                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{record.expirationDate}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Image if expanded */}
                            {record.evidence && (
                                <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-white/10 shadow-lg" onClick={handleImageClick}>
                                    <img src={record.evidence} alt="Full Evidence" className="w-full h-auto" />
                                </div>
                            )}

                            {/* Actions Footer */}
                            <div className="flex gap-3 pt-3">
                                <button
                                    onClick={onShare}
                                    className="flex-1 bg-gradient-blue-card text-white py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 btn-press shadow-blue-500/20"
                                >
                                    <span className="material-icons-round text-lg">share</span>
                                    WhatsApp
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 px-6 py-4 rounded-[1.5rem] btn-press transition-colors hover:bg-red-100"
                                >
                                    <span className="material-icons-round text-lg">delete</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Full Screen Image Modal */}
                {showImageModal && createPortal(
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-6"
                        onClick={() => setShowImageModal(false)}
                    >
                        <div className="relative max-w-full max-h-full flex flex-col items-center">
                            <img
                                src={record.evidence}
                                alt="Evidencia Full"
                                className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl animate-scale-in"
                            />
                            <div className="mt-8 flex gap-6">
                                <button
                                    className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
                                    onClick={() => setShowImageModal(false)}
                                >
                                    <span className="material-icons-round text-2xl">close</span>
                                </button>
                                <button
                                    className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-xl"
                                    onClick={onShare}
                                >
                                    <span className="material-icons-round text-2xl">share</span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
};
