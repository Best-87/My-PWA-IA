import React, { useState, useRef } from 'react';
import { Camera, FileSearch, Loader2, Check, X, FileText, AlertTriangle } from 'lucide-react';
import { generateGeminiContent } from '../../services/geminiService';
import { supabase } from '../../services/supabaseService';

interface DanfeProductReaderProps {
    onClose: () => void;
    currentPesagem: number;
}

interface ExtractedProduct {
    descricao: string;
    quantidade: number;
    valor: number;
}

const resizeImage = (base64Str: string, maxWidth = 1000): Promise<string> =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            canvas.width = width;
            canvas.height = height;

            // Simple pre-processing for better OCR (Grayscale and Contrast)
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Apply a basic white background in case of transparency
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);

                ctx.filter = 'grayscale(100%) contrast(150%)';
                ctx.drawImage(img, 0, 0, width, height);
            } else {
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            }

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = base64Str;
    });

export const DanfeProductReader: React.FC<DanfeProductReaderProps> = ({ onClose, currentPesagem }) => {
    const [step, setStep] = useState<'capture' | 'processing' | 'result' | 'error'>('capture');
    const [preview, setPreview] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
    const [errorMsg, setErrorMsg] = useState('');

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const processDANFE = async (imageSrc: string) => {
        setStep('processing');
        setPreview(imageSrc);

        try {
            // Pre-processing
            setProgress(15);
            setProgressLabel('Normalizando imagem...');
            const resized = await resizeImage(imageSrc);
            const base64Data = resized.split(',')[1];

            // OCR Extraction via Gemini
            setProgress(35);
            setProgressLabel('Lendo tabela de produtos...');

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    {
                        text: `Esta é a imagem do corpo de uma Nota Fiscal Eletrônica (DANFE).
Sua tarefa é encontrar a tabela de produtos (cabeçalhos geralmente como COD, DESCRIÇÃO, NCM, QTD, VALOR).
Extraia as informações das linhas dos produtos e retorne EXCLUSIVAMENTE UM ARRAY JSON PURO sem o formato markdown.
Para cada produto extraído, crie um objeto com exatamente estas chaves:
- "descricao": string contendo o nome ou descrição do produto.
- "quantidade": número, representando a quantidade. Converta de formato BR para float do JS (exemplo: 116,000 -> 116.0; 10,00 -> 10.0; remova quaisquer pontos de milhares, exemplo: 1.250,50 -> 1250.50). Remove commas.
- "valor": número, representando o valor unitário ou total. Siga a mesma regra da quantidade. Se der erro numérico coloque 0.0.

Se não encontrar produtos, retorne um array vazio [].
Output ONLY raw JSON array without markdown formatting.`
                    }
                ]
            };

            const text = await generateGeminiContent(prompt);

            setProgress(60);
            setProgressLabel('Analisando divergências...');

            // Limpieza robusta del JSON en caso de que Gemini se cuele con comillas invertidas
            let cleanJson = text.replace(/```json|```/g, '').trim();
            const start = cleanJson.indexOf('[');
            const end = cleanJson.lastIndexOf(']');
            if (start === -1 || end === -1) throw new Error('Não foi possível reconhecer os produtos na nota.');
            cleanJson = cleanJson.substring(start, end + 1);

            const products: ExtractedProduct[] = JSON.parse(cleanJson);

            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('Nenhum produto foi detectado na imagem. Tente melhorar o foco ou iluminação.');
            }

            setProgress(80);
            setProgressLabel('Enviando para Telegram...');

            // Preparar el resumen y validación
            let hasDivergence = false;
            let divergenceText = "";

            const productsMessageBlocks = products.map(p => {
                let diffText = "";
                // Si la diferencia supera el umbral de 2kg enviamos alerta (calculamos contra la primera pesagem actual)
                // Usualmente el comprobante se compara con la sumatoria de un producto, así que se evalua cada renglón.
                const diff = Math.abs(currentPesagem - p.quantidade);
                if (diff > 2 && currentPesagem > 0) {
                    hasDivergence = true;
                    divergenceText += `\n⚠ Divergência detectada\nProduto: ${p.descricao}\nNota fiscal: ${p.quantidade} kg\nPesagem: ${currentPesagem} kg\nDiferença: ${diff.toFixed(2)} kg\n`;
                }

                return `Produto: ${p.descricao}\nQuantidade: ${p.quantidade}\nValor: R$ ${p.valor.toFixed(2)}`;
            });

            let finalMessage = `<b>📄 Nota fiscal detectada</b>\n\n<b>Produtos:</b>\n${productsMessageBlocks.join('\n\n')}`;
            
            if (hasDivergence) {
                finalMessage += `\n\n<b>⚠️ ALERTAS DE DIVERGÊNCIA</b>${divergenceText}`;
            }

            // Llamar a nuestro nuevo módulo de telegram específico
            if (!supabase) throw new Error('Supabase não configurado');

            const { data, error } = await supabase.functions.invoke('danfe-telegram', {
                body: { message: finalMessage, imageBase64: resized }
            });

            if (error) throw new Error(`Erro no envio: ${error.message}`);
            if (!data?.success) throw new Error(data?.error || 'Erro desconhecido no envio de mensagem');

            setProgress(100);
            setProgressLabel('Concluído!');
            setExtractedProducts(products);
            setStep('result');

        } catch (err: any) {
            console.error('DanfeProductReader error:', err);
            setErrorMsg(err.message || 'Erro ao processar as tabelas da DANFE');
            setStep('error');
        }
    };

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) processDANFE(ev.target.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRetry = () => {
        setStep('capture');
        setPreview(null);
        setProgress(0);
        setProgressLabel('');
        setExtractedProducts([]);
        setErrorMsg('');
    };

    return (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {step === 'capture' && (
                    <div className="p-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                            <FileText className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight leading-tight">
                            Leitor de Produtos<br />DANFE
                        </h2>
                        <p className="text-sm text-zinc-500 mb-2 px-4">
                            Fotografe a **tabela de produtos** da nota fiscal (QTD e VALORES).
                        </p>
                        <p className="text-[10px] text-zinc-400 mb-8 px-4">
                            Os dados serão cruzados com seu pesaje atual ({currentPesagem > 0 ? `${currentPesagem} kg` : 'Nenhum valor logado'}) e enviados pro Telegram.
                        </p>

                        <div className="grid grid-cols-2 gap-4 w-full px-4 mb-2">
                            <button
                                onClick={() => cameraRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-blue-600 text-white rounded-[2rem] shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                            >
                                <Camera className="w-8 h-8 opacity-90" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
                            </button>
                            <button
                                onClick={() => galleryRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-[2rem] border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
                            >
                                <FileSearch className="w-8 h-8 opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
                            </button>
                        </div>

                        <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                        <input ref={galleryRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                    </div>
                )}

                {step === 'processing' && (
                    <div className="p-6">
                        {preview && (
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-6">
                                <img src={preview} className="w-full h-full object-cover opacity-50 filter grayscale contrast-150" alt="Process Preview" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <div className="w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{progressLabel}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'result' && (
                    <div className="p-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">Produtos Extraídos</h3>
                                <p className="text-[10px] text-emerald-600 font-bold">Relatório enviado no Telegram ✓</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {extractedProducts.map((p, idx) => {
                                const diff = Math.abs(currentPesagem - p.quantidade);
                                const isDivergent = diff > 2 && currentPesagem > 0;
                                
                                return (
                                    <div key={idx} className={`rounded-xl p-4 border ${isDivergent ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'}`}>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white mb-3 leading-snug break-words">
                                            {p.descricao}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">QTD (NF-e)</span>
                                                <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">{p.quantidade} kg/ud</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Valor Unit/Tot</span>
                                                <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">R$ {p.valor.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {isDivergent && (
                                            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/50">
                                                <div className="flex items-center gap-1.5 text-red-600 mb-1">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Divergência Crítica</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-red-600 mt-1">
                                                    <span>Pesagem local: <strong>{currentPesagem} kg</strong></span>
                                                    <span>Dif: <strong>{diff.toFixed(2)} kg</strong></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleRetry}
                            className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Nova Leitura
                        </button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 shrink-0">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white mb-2">Erro</h3>
                        <p className="text-xs text-zinc-500 mb-6 leading-relaxed break-words max-h-32 overflow-y-auto">{errorMsg}</p>
                        <button
                            onClick={handleRetry}
                            className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
