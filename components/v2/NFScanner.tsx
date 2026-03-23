import React, { useState, useRef } from 'react';
import { Camera, FileSearch, Loader2, Check, X, ScanText, Tag } from 'lucide-react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const resizeImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = base64Str;
        });
    };

    const processImage = async (imageSrc: string) => {
        setIsProcessing(true);
        setPreview(imageSrc);
        setProgress(30);

        try {
            const resized = await resizeImage(imageSrc);
            const base64Data = resized.includes(',') ? resized.split(',')[1] : resized;
            setProgress(60);

            // --- HYBRID EXTRACTION PIPELINE ---
            const { processDocumentHybrid } = await import('../../services/HybridExtractionService');
            
            setProgress(60);
            
            // Llama a la arquitectura híbrida que usa Regex + JSON Schema estricto + Auto-Learn
            const hybridResult = await processDocumentHybrid(resized, mode === 'nf' ? 'NF' : 'ETIQUETA');
            
            setProgress(90);

            // Warnings detection for the operator (Ej: Tara completada por ML)
            if (hybridResult.warnings && hybridResult.warnings.length > 0) {
                console.warn("HYBRID_ALERTS:", hybridResult.warnings);
                // Aquí en un futuro se podrían mostrar al usuario. 
            }

            // Mantener el contrato estructural con el formulario sin romper estado
            const mappedData: any = {
                cnpj: hybridResult.cnpj || '',
                invoiceNumber: '', // extraible posteriormente o por regex 
                grossWeight: hybridResult.pesoBruto || null,
                totalWeight: hybridResult.pesoBruto || null, // fallback
                supplier: hybridResult.proveedor || '', 
                product: hybridResult.productosDesc.join(' | ') || '',
                batch: hybridResult.lote || '',
                expirationDate: hybridResult.fechaVencimiento || null,
                unitTara: hybridResult.tara !== null ? hybridResult.tara * 1000 : null, // kg to g translation
                evidence: resized 
            };

            const summary = mode === 'nf'
                ? `Capturado CNPJ: ${mappedData.cnpj || '?'} - ${mappedData.grossWeight || '?'}kg`
                : `${mappedData.product || 'Produto'} - Tara: ${(hybridResult.tara || 0).toFixed(3)}kg ${hybridResult.warnings.length > 0 ? '⚠️' : ''}`;

            setOcrText(`Extraído: ${summary}`);
            onDataExtracted(mappedData);

            // Notify Telegram for labels (immediate feedback with photo)
            if (mode === 'label' && supabase) {
                const labelLines = [
                    `<b>🏷️ Etiqueta de Produto Detectada</b>`,
                    `---------------------------`,
                    `📦 <b>Produto:</b> ${mappedData.product || 'N/A'}`,
                    `🔢 <b>Lote:</b> ${mappedData.batch || 'N/A'}`,
                    `📅 <b>Validade:</b> ${mappedData.expirationDate || 'N/A'}`,
                ];
                if (mappedData.unitTara) labelLines.push(`⚖️ <b>Tara Informada:</b> ${mappedData.unitTara}g`);
                if (mappedData.supplier) labelLines.push(`🏢 <b>Fornecedor:</b> ${mappedData.supplier}`);
                supabase.functions.invoke('danfe-telegram', {
                    body: { 
                        message: labelLines.join('\n'),
                        imageBase64: resized 
                    }
                }).catch((err: any) => console.error("Label Telegram notify error:", err));
            }

            setProgress(100);

            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (error) {
            console.error("OCR Error:", error);
            setOcrText("Erro no scanner");
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    processImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const accentColor = mode === 'nf' ? 'blue' : 'purple';
    const accentClasses = mode === 'nf'
        ? { bg: 'bg-blue-600', text: 'text-blue-500', glow: 'shadow-blue-500/20', light: 'bg-blue-500/10', border: 'border-blue-500/30' }
        : { bg: 'bg-purple-600', text: 'text-purple-500', glow: 'shadow-purple-500/20', light: 'bg-purple-500/10', border: 'border-purple-500/30' };

    return (
        <div className="fixed inset-0 z-[300] flex flex-col items-end justify-end animate-fade-in" style={{ background: 'rgba(10,12,18,0.75)', backdropFilter: 'blur(20px)' }}>
            {/* Tap outside = close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Bottom sheet */}
            <div className="relative w-full max-w-lg mx-auto bg-[#111318] rounded-t-[2.5rem] overflow-hidden shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] animate-slide-up">
                {/* Accent top bar */}
                <div className={`h-1 w-full ${accentClasses.bg}`} />
                
                {/* Handle */}
                <div className="flex justify-center pt-4 pb-2">
                    <div className="w-10 h-1 bg-white/10 rounded-full" />
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-zinc-400"
                >
                    <X className="w-5 h-5" />
                </button>

                {!preview ? (
                    <div className="px-8 pb-10 pt-2 flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className={`relative w-20 h-20 ${accentClasses.light} border ${accentClasses.border} rounded-2xl flex items-center justify-center mb-5 mt-2`}>
                            {mode === 'nf'
                                ? <FileSearch className={`w-9 h-9 ${accentClasses.text}`} />
                                : <ScanText className={`w-9 h-9 ${accentClasses.text}`} />
                            }
                        </div>

                        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-1">
                            {mode === 'nf' ? 'Scanner de Nota Fiscal' : 'Scanner de Etiqueta'}
                        </h2>
                        <p className="text-xs text-zinc-500 mb-8 max-w-[260px] leading-relaxed">
                            {mode === 'nf'
                                ? 'Aponte para a nota fiscal ou DANFE. A IA irá extrair o CNPJ, pesos e dados automaticamente.'
                                : 'Aponte para a etiqueta do produto. Serão extraídos lote, validade, tara e fornecedor.'}
                        </p>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex flex-col items-center gap-2.5 p-5 ${accentClasses.bg} text-white rounded-2xl ${accentClasses.glow} shadow-lg active:scale-95 transition-all`}
                            >
                                <Camera className="w-7 h-7" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
                            </button>

                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex flex-col items-center gap-2.5 p-5 bg-white/5 border border-white/8 text-zinc-300 rounded-2xl active:scale-95 transition-all hover:bg-white/8"
                            >
                                <FileSearch className="w-7 h-7 opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
                            </button>
                        </div>

                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                        <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                    </div>
                ) : (
                    <div className="px-6 pb-10 pt-4">
                        {/* Preview frame with scan line */}
                        <div className="relative rounded-2xl overflow-hidden bg-black mb-5" style={{ aspectRatio: '4/3' }}>
                            <img src={preview} className="w-full h-full object-cover" style={{ opacity: isProcessing ? 0.45 : 0.7 }} alt="Preview" />

                            {/* Scan corner brackets */}
                            <div className="absolute inset-4 pointer-events-none">
                                <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${mode === 'nf' ? 'border-blue-400' : 'border-purple-400'} rounded-tl-lg`} />
                                <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${mode === 'nf' ? 'border-blue-400' : 'border-purple-400'} rounded-tr-lg`} />
                                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${mode === 'nf' ? 'border-blue-400' : 'border-purple-400'} rounded-bl-lg`} />
                                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${mode === 'nf' ? 'border-blue-400' : 'border-purple-400'} rounded-br-lg`} />
                            </div>

                            {isProcessing ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className={`w-8 h-8 animate-spin ${accentClasses.text}`} />
                                    <div className="w-2/3">
                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full ${accentClasses.bg} transition-all duration-500`} style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className="text-[9px] text-white/40 font-black uppercase tracking-widest text-center mt-2">{progress}%</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/80 gap-2">
                                    <Check className="w-10 h-10 text-white" />
                                    <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Dados Capturados</span>
                                </div>
                            )}
                        </div>

                        <p className={`text-center text-[10px] font-black uppercase tracking-widest animate-pulse ${accentClasses.text}`}>
                            {ocrText || 'Analisando imagem com IA...'}
                        </p>

                        {ocrText === 'Erro no scanner' && (
                            <button
                                onClick={() => { setPreview(null); setOcrText(''); }}
                                className="mt-4 w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Tentar Novamente
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

