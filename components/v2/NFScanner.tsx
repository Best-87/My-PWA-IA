import React, { useState, useRef } from 'react';
import { Camera, FileSearch, Loader2, Check, X, ScanText } from 'lucide-react';
import { generateGeminiContent } from '../../services/geminiService';
import { supabase } from '../../services/supabaseService';

interface OCRProcessorProps {
    mode: 'nf' | 'label';
    onDataExtracted: (data: any) => void;
    onClose: () => void;
}

export const NFScanner: React.FC<OCRProcessorProps> = ({ mode, onDataExtracted, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState<string>('');
    const [done, setDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const isNF = mode === 'nf';
    const accent = isNF
        ? { ring: 'ring-blue-500/30', bar: 'bg-blue-600', icon: 'text-blue-500', iconBg: 'bg-blue-500/10 dark:bg-blue-500/15', border: 'border-blue-500/20', btn: 'bg-blue-600', glow: 'shadow-blue-500/20', bracketColor: 'border-blue-400' }
        : { ring: 'ring-violet-500/30', bar: 'bg-violet-500', icon: 'text-violet-500', iconBg: 'bg-violet-500/10 dark:bg-violet-500/15', border: 'border-violet-500/20', btn: 'bg-violet-600', glow: 'shadow-violet-500/20', bracketColor: 'border-violet-400' };

    const resizeImage = (base64Str: string): Promise<string> =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = base64Str;
        });

    const processImage = async (imageSrc: string) => {
        setIsProcessing(true);
        setPreview(imageSrc);
        setProgress(30);

        try {
            const resized = await resizeImage(imageSrc);
            setProgress(60);

            const { processDocumentHybrid } = await import('../../services/HybridExtractionService');
            const hybridResult = await processDocumentHybrid(resized, mode === 'nf' ? 'NF' : 'ETIQUETA');
            setProgress(90);

            if (hybridResult.warnings?.length > 0) {
                console.warn('HYBRID_ALERTS:', hybridResult.warnings);
            }

            const mappedData: any = {
                cnpj: hybridResult.cnpj || '',
                invoiceNumber: '',
                grossWeight: hybridResult.pesoBruto || null,
                totalWeight: hybridResult.pesoBruto || null,
                supplier: hybridResult.proveedor || '',
                product: hybridResult.productosDesc[0] || '',
                products: hybridResult.productosDesc.filter(Boolean),
                batch: hybridResult.lote || '',
                expirationDate: hybridResult.fechaVencimiento || null,
                unitTara: hybridResult.tara !== null ? hybridResult.tara * 1000 : null,
                evidence: resized
            };

            const summary = isNF
                ? `CNPJ: ${mappedData.cnpj || '?'} — ${mappedData.grossWeight || '?'}kg`
                : `${mappedData.product || 'Produto'} — Tara: ${(hybridResult.tara || 0).toFixed(3)}kg`;

            setOcrText(summary);
            onDataExtracted(mappedData);

            if (mode === 'label' && supabase) {
                const labelLines = [
                    `<b>🏷️ Etiqueta Detectada</b>`,
                    `📦 <b>Produto:</b> ${mappedData.product || 'N/A'}`,
                    `🔢 <b>Lote:</b> ${mappedData.batch || 'N/A'}`,
                    `📅 <b>Validade:</b> ${mappedData.expirationDate || 'N/A'}`,
                ];
                if (mappedData.unitTara) labelLines.push(`⚖️ <b>Tara:</b> ${mappedData.unitTara}g`);
                supabase.functions.invoke('danfe-telegram', {
                    body: { message: labelLines.join('\n'), imageBase64: resized }
                }).catch((err: any) => console.error('Label Telegram notify error:', err));
            }

            setProgress(100);
            setDone(true);

            // Auto-close after brief success state
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            console.error('OCR Error:', error);
            setOcrText('Erro no scanner');
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) processImage(event.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end">
            {/* Transparent overlay — tap to dismiss */}
            <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />

            {/* Sheet card */}
            <div className="relative animate-slide-up">
                <div className="mx-3 mb-3 bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xl">

                    {/* Accent stripe at top */}
                    <div className={`h-1 w-full ${accent.bar}`} />

                    {/* Pill handle */}
                    <div className="flex justify-center py-3">
                        <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* ── IDLE STATE ── */}
                    {!preview && (
                        <div className="px-6 pb-8 flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-2xl ${accent.iconBg} border ${accent.border} flex items-center justify-center mb-4`}>
                                {isNF
                                    ? <FileSearch className={`w-7 h-7 ${accent.icon}`} />
                                    : <ScanText className={`w-7 h-7 ${accent.icon}`} />
                                }
                            </div>

                            <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">
                                {isNF ? 'Scanner de Nota Fiscal' : 'Scanner de Etiqueta'}
                            </h2>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[240px] leading-relaxed mb-6">
                                {isNF
                                    ? 'Fotografe a nota fiscal. A IA extrai CNPJ, pesos e dados do cabeçalho.'
                                    : 'Fotografe a etiqueta. A IA extrai lote, validade, tara e fornecedor.'}
                            </p>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex flex-col items-center gap-2 py-4 ${accent.btn} text-white rounded-2xl shadow-lg ${accent.glow} active:scale-95 transition-all`}
                                >
                                    <Camera className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
                                </button>

                                <button
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
                                >
                                    <FileSearch className="w-6 h-6 opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
                                </button>
                            </div>

                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                            <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                        </div>
                    )}

                    {/* ── PROCESSING / DONE STATE ── */}
                    {preview && (
                        <div className="px-4 pb-6">
                            {/* Preview frame */}
                            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 mb-4" style={{ aspectRatio: '4/3' }}>
                                <img
                                    src={preview}
                                    className="w-full h-full object-cover transition-opacity duration-500"
                                    style={{ opacity: done ? 0.3 : 0.5 }}
                                    alt=""
                                />

                                {/* Scanning brackets */}
                                {!done && (
                                    <div className="absolute inset-4 pointer-events-none">
                                        <div className={`absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] ${accent.bracketColor} rounded-tl-lg`} />
                                        <div className={`absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] ${accent.bracketColor} rounded-tr-lg`} />
                                        <div className={`absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] ${accent.bracketColor} rounded-bl-lg`} />
                                        <div className={`absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] ${accent.bracketColor} rounded-br-lg`} />
                                    </div>
                                )}

                                {/* Moving scan line */}
                                {isProcessing && !done && (
                                    <div className={`animate-scan-line ${accent.bar} opacity-70`} style={{ boxShadow: `0 0 8px 1px currentColor` }} />
                                )}

                                {/* Result overlay */}
                                {done && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/80">
                                        <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                                        <span className="text-[11px] text-white font-black uppercase tracking-[0.15em]">Dados Capturados</span>
                                    </div>
                                )}
                            </div>

                            {/* Status text + progress */}
                            {!done ? (
                                <div className="space-y-2">
                                    <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${accent.bar} rounded-full transition-all duration-500`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className={`text-center text-[10px] font-black uppercase tracking-widest ${accent.icon} animate-pulse`}>
                                        {ocrText || 'Analisando com IA...'}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                    {ocrText}
                                </p>
                            )}

                            {/* Retry button on error */}
                            {ocrText === 'Erro no scanner' && (
                                <button
                                    onClick={() => { setPreview(null); setOcrText(''); setProgress(0); setDone(false); }}
                                    className="mt-3 w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Tentar Novamente
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
