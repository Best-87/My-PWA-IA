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

    return (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-in">
                {!preview ? (
                    <div className="p-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                            {mode === 'nf' ? <FileSearch className="w-10 h-10 text-blue-600" /> : <ScanText className="w-10 h-10 text-purple-600" />}
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">
                            {mode === 'nf' ? 'Scanner de Notas' : 'Scanner de Rótulo'}
                        </h2>
                        <p className="text-sm text-zinc-500 mb-8 px-6">
                            {mode === 'nf'
                                ? 'Posicione a nota fiscal ou romaneio para extração de CNPJ e pesos.'
                                : 'Posicione o rótulo do produto para extração de lote, validade e produto.'}
                        </p>

                        <div className="grid grid-cols-2 gap-4 w-full px-8 mb-10">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-blue-600 text-white rounded-[2rem] shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                            >
                                <Camera className="w-8 h-8 opacity-90" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
                            </button>

                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-[2rem] shadow-sm border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
                            >
                                <FileSearch className="w-8 h-8 opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCapture}
                        />
                        <input
                            ref={galleryInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleCapture}
                        />
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-6">
                            <img src={preview} className="w-full h-full object-cover opacity-60" alt="Preview" />
                            {isProcessing ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <div className="w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest mt-2">{progress}%</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/90 text-white p-3 rounded-2xl gap-2 font-bold animate-fade-in">
                                    <Check className="w-10 h-10" />
                                    <span className="uppercase tracking-[0.2em] text-[10px]">Extração Concluída</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center space-y-4">
                            <p className="text-xs text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                                {ocrText || "Processando padrões..."}
                            </p>

                            {ocrText === "Erro no scanner" && (
                                <button
                                    onClick={() => { setPreview(null); setOcrText(''); }}
                                    className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Tente Novamente
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
