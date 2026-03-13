
import React, { useState, useRef } from 'react';
import { Camera, FileSearch, Loader2, Check, X, QrCode, AlertTriangle, ExternalLink } from 'lucide-react';
import { generateGeminiContent } from '../../services/geminiService';
import { supabase } from '../../services/supabaseService';

interface DANFEProcessorProps {
    onClose: () => void;
}

interface DecodedChave {
    estado: string;
    cnpjFormatted: string;
    mes: string;
    modelo: string;
    serie: string;
    numeroNF: string;
    tipoEmissao: string;
}

interface ProcessResult {
    chave: string;
    decoded: DecodedChave | null;
    sefazLink: string;
    telegram_message_id?: number;
}

const resizeImage = (base64Str: string, maxWidth = 1200): Promise<string> =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = base64Str;
    });

export const DANFEProcessor: React.FC<DANFEProcessorProps> = ({ onClose }) => {
    const [step, setStep] = useState<'capture' | 'processing' | 'result' | 'error'>('capture');
    const [preview, setPreview] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [result, setResult] = useState<ProcessResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const processDANFE = async (imageSrc: string) => {
        setStep('processing');
        setPreview(imageSrc);

        try {
            // Step 1: Resize image
            setProgress(15);
            setProgressLabel('Redimensionando imagem...');
            const resized = await resizeImage(imageSrc);
            const base64Data = resized.split(',')[1];

            // Step 2: Use Gemini to read the Code-128 barcode from the DANFE
            setProgress(35);
            setProgressLabel('Lendo código de barras Code-128...');

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    {
                        text: `Esta é uma imagem de uma DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) brasileira.
Sua tarefa é localizar e ler o CÓDIGO DE BARRAS do tipo Code-128 presente neste documento.
O código de barras Code-128 contém exatamente 44 dígitos numéricos — esta é a Chave de Acesso da NF-e.
Retorne APENAS um JSON com o seguinte formato:
{ "chave_acesso": "string com 44 dígitos numéricos" }
Se não encontrar o código de barras, retorne: { "chave_acesso": null }
Output ONLY raw JSON without markdown.`
                    }
                ]
            };

            const text = await generateGeminiContent(prompt);

            // Step 3: Parse and validate the key
            setProgress(60);
            setProgressLabel('Validando chave de acesso...');

            let cleanJson = text.replace(/```json|```/g, '').trim();
            const start = cleanJson.indexOf('{');
            const end = cleanJson.lastIndexOf('}');
            if (start === -1 || end === -1) throw new Error('Resposta inválida da IA');
            cleanJson = cleanJson.substring(start, end + 1);

            const parsed = JSON.parse(cleanJson);
            const rawChave = parsed.chave_acesso;

            if (!rawChave) {
                throw new Error('Código de barras não encontrado na imagem. Tente fotografar apenas a área do código de barras com boa iluminação.');
            }

            const chave = String(rawChave).replace(/\D/g, '');
            if (chave.length !== 44) {
                throw new Error(`Chave extraída tem ${chave.length} dígitos (esperado 44). Verifique a imagem.`);
            }

            // Step 4: Call the nfe-extractor Edge Function
            setProgress(80);
            setProgressLabel('Enviando para Telegram...');

            if (!supabase) throw new Error('Supabase não configurado');

            const { data, error } = await supabase.functions.invoke('nfe-extractor', {
                body: { chaveAcesso: chave }
            });

            if (error) throw new Error(`Erro na função: ${error.message}`);
            if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

            setProgress(100);
            setProgressLabel('Concluído!');
            setResult(data as ProcessResult);
            setStep('result');

        } catch (err: any) {
            console.error('DANFEProcessor error:', err);
            setErrorMsg(err.message || 'Erro ao processar DANFE');
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
        setResult(null);
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

                {/* CAPTURE STEP */}
                {step === 'capture' && (
                    <div className="p-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                            <QrCode className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">
                            Leitor DANFE / NF-e
                        </h2>
                        <p className="text-sm text-zinc-500 mb-2 px-4">
                            Fotografe o <strong>código de barras Code-128</strong> da nota fiscal para extrair a chave de acesso (44 dígitos).
                        </p>
                        <p className="text-[10px] text-zinc-400 mb-8 px-4">
                            A chave será decodificada e enviada automaticamente para o canal Telegram.
                        </p>

                        <div className="grid grid-cols-2 gap-4 w-full px-4 mb-6">
                            <button
                                onClick={() => cameraRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-emerald-600 text-white rounded-[2rem] shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
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

                        <div className="text-[9px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-3 text-center">
                            ⚠️ Para download do XML é necessário certificado digital junto à SEFAZ. Esta função extrai e envia a chave de acesso.
                        </div>

                        <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                        <input ref={galleryRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                    </div>
                )}

                {/* PROCESSING STEP */}
                {step === 'processing' && (
                    <div className="p-6">
                        {preview && (
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-6">
                                <img src={preview} className="w-full h-full object-cover opacity-50" alt="DANFE Preview" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <div className="w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{progressLabel}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* RESULT STEP */}
                {step === 'result' && result && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                                <Check className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">NF-e Processada</h3>
                                <p className="text-[10px] text-emerald-600 font-bold">Enviada ao Telegram ✓</p>
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-2 mb-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Chave de Acesso</p>
                            <p className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 break-all leading-relaxed">
                                {result.chave.slice(0,11)} {result.chave.slice(11,22)} {result.chave.slice(22,33)} {result.chave.slice(33,44)}
                            </p>
                        </div>

                        {result.decoded && (
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {[
                                    { label: 'Estado', val: result.decoded.estado },
                                    { label: 'Emissão', val: result.decoded.mes },
                                    { label: 'NF Nº', val: result.decoded.numeroNF },
                                    { label: 'Série', val: result.decoded.serie },
                                    { label: 'Modelo', val: result.decoded.modelo },
                                    { label: 'Tipo', val: result.decoded.tipoEmissao },
                                ].map(({ label, val }) => (
                                    <div key={label} className="bg-white dark:bg-zinc-900 rounded-xl p-2 border border-zinc-100 dark:border-zinc-700">
                                        <span className="text-[8px] font-black uppercase text-zinc-400 block">{label}</span>
                                        <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">{val}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {result.decoded && (
                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-2 mb-4">
                                <span className="text-[8px] font-black uppercase text-zinc-400 block mb-0.5">CNPJ Emitente</span>
                                <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">{result.decoded.cnpjFormatted}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href={result.sefazLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> SEFAZ
                            </a>
                            <button
                                onClick={handleRetry}
                                className="py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Nova Leitura
                            </button>
                        </div>
                    </div>
                )}

                {/* ERROR STEP */}
                {step === 'error' && (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white mb-2">Erro no Processamento</h3>
                        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">{errorMsg}</p>
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
