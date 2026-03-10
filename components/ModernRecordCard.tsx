import React from 'react';
import { WeighingRecord } from '../types';
import { useTranslation } from '../services/i18n';
import {
    Calendar, Package, Tag, Scale, AlertCircle, CheckCircle2,
    Trash2, Share2, ChevronRight, Info, Thermometer, Clock
} from 'lucide-react';

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
    const diff = (record.netWeight || 0) - (record.noteWeight || 0);
    const isOk = Math.abs(diff) <= TOLERANCE_KG;

    return (
        <div
            onClick={onExpand}
            className={`bg-white dark:bg-zinc-900 rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded
                ? 'border-zinc-900 dark:border-white ring-4 ring-zinc-500/5 shadow-2xl scale-[1.02] z-10'
                : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 active:scale-98 shadow-sm'
                }`}
        >
            {/* 1. Main Row (Compact) */}
            <div className={`p-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-zinc-50/50 dark:bg-zinc-800/30' : ''}`}>
                <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isOk
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-500'
                        }`}>
                        {isOk ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>

                    <div>
                        <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight line-clamp-1">
                            {record.product || 'SEM NOME'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                {record.supplier || 'N/A'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase">
                                <Clock className="w-3 h-3" />
                                {new Date(record.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </div>
                        </div>
                    </div>
                </div>

                {!isExpanded && (
                    <div className="text-right flex items-center gap-4">
                        <div className="hidden sm:block">
                            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">NETO (KG)</div>
                            <div className="text-lg font-black text-zinc-900 dark:text-white leading-none mt-1">
                                {(record.netWeight || 0).toFixed(2)}
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-zinc-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                )}
            </div>

            {/* 2. Expanded Content */}
            {isExpanded && (
                <div className="p-6 pt-2 space-y-6 animate-fade-in">
                    {/* Weights Dashboard */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/80 p-5 rounded-3xl text-center border border-zinc-100 dark:border-zinc-700">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-1">PESO NOTA</span>
                            <span className="text-2xl font-black text-zinc-900 dark:text-white">{(record.noteWeight || 0).toFixed(2)} KG</span>
                        </div>
                        <div className="bg-zinc-900 dark:bg-white p-5 rounded-3xl text-center shadow-lg">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block mb-1">PESO BRUTO</span>
                            <span className="text-2xl font-black text-white dark:text-zinc-900">{(record.grossWeight || 0).toFixed(2)} KG</span>
                        </div>
                    </div>

                    {/* Comparative Analysis */}
                    <div className={`p-4 rounded-[2rem] flex items-center justify-between ${isOk
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 opacity-70" />
                            <div>
                                <span className="text-[8px] font-black uppercase tracking-widest block opacity-70">Resultado</span>
                                <span className="text-xs font-black uppercase tracking-tight">
                                    {isOk ? 'Precisão Garantida' : `${Math.abs(diff).toFixed(2)} KG Divergência`}
                                </span>
                            </div>
                        </div>
                        <span className="text-lg font-black">{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                    </div>

                    {/* Logistics Detail Grid */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-[2rem] p-5 border border-zinc-100 dark:border-zinc-800 space-y-5">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" /> Detalhes Logísticos
                        </h5>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2"><Tag className="w-3 h-3" /> LOTE</span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white uppercase truncate">{record.batch || 'NÃO INF.'}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2"><Calendar className="w-3 h-3" /> VALIDADE</span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white uppercase truncate">{record.expirationDate || 'NÃO INF.'}</span>
                            </div>
                            {record.noteNumber && (
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2"><Info className="w-3 h-3" /> № NOTA</span>
                                    <span className="text-xs font-black text-zinc-900 dark:text-white uppercase truncate">{record.noteNumber}</span>
                                </div>
                            )}
                            {record.taraTotal > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2"><Scale className="w-3 h-3" /> TARA TOTAL</span>
                                    <span className="text-xs font-black text-zinc-900 dark:text-white uppercase truncate">{record.taraTotal.toFixed(2)} KG</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Evidence & AI Analysis */}
                    {record.evidence && (
                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                            <img src={record.evidence} className="w-full h-full object-cover" alt="Evidencia" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                <div className="flex items-center gap-2 text-white/90">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Captura em tempo real</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {record.aiAnalysis && (
                        <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-blue-600 dark:text-blue-400">
                            <div className="flex items-center gap-2 mb-2 opacity-70">
                                <Info className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Insights da IA</span>
                            </div>
                            <p className="text-xs font-bold leading-relaxed">{record.aiAnalysis}</p>
                        </div>
                    )}

                    {/* Floating Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onShare(e); }}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all text-zinc-900 dark:text-white"
                        >
                            <Share2 className="w-4 h-4" /> Compartilhar
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                            className="w-16 h-14 bg-red-500/10 text-red-500 flex items-center justify-center rounded-2xl active:scale-95 transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
