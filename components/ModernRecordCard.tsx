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
    const statusColor = isError ? 'red' : 'emerald';

    return (
        <>
            <div
                className="smart-card overflow-hidden animate-fade-in-up transition-all hover:scale-[1.01] active:scale-[0.98] mb-4"
                onClick={onExpand}
            >
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isError ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                <span className="material-icons-round text-xl">{isError ? 'priority_high' : 'check_circle'}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">{record.product}</h3>
                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{record.supplier}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-zinc-400 font-mono font-bold block mb-1">
                                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {isError ? 'ERROR' : 'OK'}
                            </span>
                        </div>
                    </div>

                    {/* Integrated Image if exists and not expanded */}
                    {!isExpanded && record.evidence && (
                        <div className="mb-4 rounded-xl overflow-hidden h-24 relative border border-zinc-100 dark:border-white/5" onClick={handleImageClick}>
                            <img src={record.evidence} alt="Evidence" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                    )}

                    {/* Metrics Grid - Smart Tiles */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-50 dark:bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-zinc-100/50 dark:border-white/5">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm text-zinc-400">
                                <span className="material-icons-round text-sm">scale</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block">{t('lbl_net')}</span>
                                <span className="text-sm font-black text-zinc-800 dark:text-white tabular-nums">{record.netWeight.toFixed(2)}<span className="text-[10px] font-bold opacity-40 ml-0.5">kg</span></span>
                            </div>
                        </div>
                        <div className={`rounded-2xl p-3 flex items-center gap-3 border ${isError ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-500/20' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20'}`}>
                            <div className={`w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm ${isError ? 'text-red-500' : 'text-emerald-500'}`}>
                                <span className="material-icons-round text-sm">difference</span>
                            </div>
                            <div>
                                <span className={`text-[9px] font-bold uppercase block ${isError ? 'text-red-400' : 'text-emerald-400'}`}>Dif.</span>
                                <span className={`text-sm font-black tabular-nums ${isError ? 'text-red-500' : 'text-emerald-500'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                            </div>
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
