
import React, { useState, useRef } from 'react';
import { Camera, Loader2, Check, X, AlertTriangle, FileText, Search } from 'lucide-react';
import { generateGeminiContent } from '../../services/geminiService';
import { supabase } from '../../services/supabaseService';

interface UnifiedNFProcessorProps {
    onClose: () => void;
    onDataCombined: (data: any) => void;
    currentPesagem: number;
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
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
            }
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = base64Str;
    });

export const UnifiedNFProcessor: React.FC<UnifiedNFProcessorProps> = ({ onClose, onDataCombined, currentPesagem }) => {
    const [step, setStep] = useState<'capture' | 'processing' | 'result' | 'error'>('capture');
    const [preview, setPreview] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [extractedData, setExtractedData] = useState<any>(null);

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const processFullNF = async (imageSrc: string) => {
        setStep('processing');
        setPreview(imageSrc);

        try {
            setProgress(10);
            setProgressLabel('Otimizando imagem...');
            const resized = await resizeImage(imageSrc);
            const base64Data = resized.split(',')[1];

            setProgress(30);
            setProgressLabel('IA: Analisando documento completo...');

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    {
                        text: `Aja como um especialista em logística e OCR. Analise esta Nota Fiscal (DANFE) e extraia TUDO o que for visível.
Retorne um JSON único con:
1. "chave_acesso": string (44 dígitos do código de barras).
2. "cabecalho": { "cnpj_emitente": string, "numero_nota": string, "peso_bruto": num, "peso_liquido": num, "fornecedor": string }.
3. "productos": array de objetos [ { "descricao": string, "quantidade": float, "valor": float } ].

Regras: Converta formatos BR (1.250,50) para float JS (1250.50). Se não encontrar algo, coloque null.
Output ONLY raw JSON.`
                    }
                ]
            };

            const aiText = await generateGeminiContent(prompt);
            setProgress(70);
            setProgressLabel('Sincronizando dados...');

            let cleanJson = aiText.replace(/```json|```/g, '').trim();
            const start = cleanJson.indexOf('{');
            const end = cleanJson.lastIndexOf('}');
            if (start === -1) throw new Error('Falha na interpretação da IA');
            cleanJson = cleanJson.substring(start, end + 1);

            const rawResult = JSON.parse(cleanJson);

            setProgress(85);
            setProgressLabel('Finalizando relatório...');

            const lines = [
                `<b>🚀 NF-e Processada (Unificada)</b>`,
                `---------------------------`,
                `🏢 <b>Fornecedor:</b> ${rawResult.cabecalho?.fornecedor || 'N/A'}`,
                `📄 <b>Nota Nº:</b> ${rawResult.cabecalho?.numero_nota || 'N/A'}`,
                `🔑 <b>Chave:</b> <code>${rawResult.chave_acesso || 'Não detectada'}</code>`,
            ];

            if (rawResult.chave_acesso && rawResult.chave_acesso.length === 44) {
                const sefazLink = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${rawResult.chave_acesso}`;
                lines.push(`🔗 <a href="${sefazLink}">Ver na SEFAZ</a>`);
            }

            lines.push(`---------------------------`);

            if (rawResult.productos && rawResult.productos.length > 0) {
                lines.push(`📦 <b>Produtos na Nota:</b>`);
                rawResult.productos.forEach((p: any) => {
                    const diff = Math.abs(currentPesagem - p.quantidade);
                    const alert = (diff > 0.5 && currentPesagem > 0) ? ` ⚠️ (Pesagem: ${currentPesagem}kg)` : '';
                    lines.push(`• ${p.descricao}: <b>${p.quantidade}kg</b> ${alert}`);
                });
            }

            if (currentPesagem > 0) lines.push(`⚖️ <b>Status:</b> ${currentPesagem}kg`);

            if (!supabase) throw new Error('Supabase offline');

            await supabase.functions.invoke('danfe-telegram', {
                body: { message: lines.join('\n'), imageBase64: resized }
            });

            const finalMapped = {
                supplier: rawResult.cabecalho?.fornecedor || '',
                cnpj: rawResult.cabecalho?.cnpj_emitente || '',
                noteNumber: rawResult.cabecalho?.numero_nota || '',
                accessKey: rawResult.chave_acesso || '',
                grossWeight: rawResult.cabecalho?.peso_bruto || null,
                totalWeight: rawResult.cabecalho?.peso_liquido || null,
                evidence: resized,
                product: rawResult.productos?.[0]?.descricao || ''
            };

            setExtractedData(rawResult);
            onDataCombined(finalMapped);
            setProgress(100);
            setStep('result');

        } catch (err: any) {
            console.error('UnifiedProcessor error:', err);
            setErrorMsg(err.message || 'Erro unificado');
            setStep('error');
        }
    };

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => ev.target?.result && processFullNF(ev.target.result as string);
        reader.readAsDataURL(file);
    };

    return (
        <div
            className="fixed inset-0 z-[500] flex flex-col items-end justify-end animate-fade-in"
            style={{ background: 'rgba(10,12,18,0.75)', backdropFilter: 'blur(20px)' }}
        >
            {/* tap outside = close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Bottom sheet */}
            <div className="relative w-full bg-[#111318] rounded-t-[2.5rem] overflow-hidden shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)]">
                {/* Blue accent bar */}
                <div className="h-1 w-full bg-blue-600" />

                {/* Drag handle */}
                <div className="flex justify-center pt-4 pb-1">
                    <div className="w-10 h-1 bg-white/10 rounded-full" />
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-zinc-400"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* ── CAPTURE ── */}
                {step === 'capture' && (
                    <div className="px-8 pb-10 pt-4 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4 mt-1">
                            <FileText className="w-8 h-8 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-0.5">Processador NF-e</h2>
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-3">DANFE — EXTRAÇÃO INTELIGENTE</p>
                        <p className="text-xs text-zinc-500 mb-7 max-w-[260px] leading-relaxed">
                            Fotografe a nota fiscal. A IA extrai chave de acesso, CNPJ, pesos e produtos automaticamente.
                        </p>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button
                                onClick={() => cameraRef.current?.click()}
                                className="flex flex-col items-center gap-2 py-5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                <Camera className="w-6 h-6" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Câmera</span>
                            </button>
                            <button
                                onClick={() => galleryRef.current?.click()}
                                className="flex flex-col items-center gap-2 py-5 bg-white/5 border border-white/5 text-zinc-300 rounded-2xl active:scale-95 transition-all"
                            >
                                <Search className="w-6 h-6 opacity-70" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Galeria</span>
                            </button>
                        </div>
                        <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                        <input ref={galleryRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                    </div>
                )}

                {/* ── PROCESSING ── */}
                {step === 'processing' && (
                    <div className="px-8 pb-10 pt-4 flex flex-col items-center gap-5">
                        {preview && (
                            <div className="w-full rounded-xl overflow-hidden bg-black relative" style={{ aspectRatio: '16/9' }}>
                                <img src={preview} className="w-full h-full object-cover" style={{ opacity: 0.3 }} alt="" />
                                {/* scan line */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="w-full h-px bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-scan-line" />
                                </div>
                                {/* corner brackets */}
                                <div className="absolute inset-3 pointer-events-none">
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl" />
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl" />
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br" />
                                </div>
                            </div>
                        )}
                        <div className="w-full space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    {progressLabel || 'Processando...'}
                                </span>
                                <span className="text-[9px] font-black text-blue-400">{progress}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── RESULT ── */}
                {step === 'result' && (
                    <div className="px-8 pb-10 pt-4 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 mt-1">
                            <Check className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-0.5">Extração Concluída</h2>
                        <p className="text-xs text-zinc-500 mb-7 max-w-[240px] leading-relaxed">
                            Formulário preenchido e relatório enviado ao Telegram com sucesso.
                        </p>
                        <button onClick={onClose} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
                            VOLTAR AO FORMULÁRIO
                        </button>
                    </div>
                )}

                {/* ── ERROR ── */}
                {step === 'error' && (
                    <div className="px-8 pb-10 pt-4 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4 mt-1">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-0.5">Não foi possível extrair</h2>
                        <p className="text-xs text-zinc-500 mb-7 max-w-[240px] leading-relaxed">{errorMsg}</p>
                        <button onClick={() => setStep('capture')} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
