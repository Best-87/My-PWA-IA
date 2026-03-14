
import React, { useState, useRef } from 'react';
import { Camera, FileSearch, Loader2, Check, X, QrCode, AlertTriangle, FileText, Search } from 'lucide-react';
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
    
    // Almacenamos los resultados de las micro-extracciones
    const [extractedData, setExtractedData] = useState<any>(null);

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const processFullNF = async (imageSrc: string) => {
        setStep('processing');
        setPreview(imageSrc);

        try {
            // 1. Redimensionar
            setProgress(10);
            setProgressLabel('Otimizando imagem...');
            const resized = await resizeImage(imageSrc);
            const base64Data = resized.split(',')[1];

            // 2. Extracción Inteligente Unificada (Inteligencia Artificial)
            setProgress(30);
            setProgressLabel('IA: Analisando documento completo...');

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    {
                        text: `Aja como um especialista em logística e OCR. Analise esta Nota Fiscal (DANFE) e extraia TUDO o que for visível.
Retorne um JSON único com:
1. "chave_acesso": string (44 dígitos do código de barras).
2. "cabecalho": { "cnpj_emitente": string, "numero_nota": string, "peso_bruto": num, "peso_liquido": num, "fornecedor": string }.
3. "produtos": array de objetos [ { "descricao": string, "quantidade": float, "valor": float } ].

Regras Numéricas: Converta formatos BR (1.250,50) para float JS (1250.50). 
Se não encontrar algo, coloque null.
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

            // 3. Normalizar y Enviar a Telegram vía Edge Functions (Mantenemos compatibilidad)
            setProgress(85);
            setProgressLabel('Finalizando relatório...');

            // Formatear mensaje rico para Telegram
            const lines = [
                `<b>🚀 NF-e Processada (Unificada)</b>`,
                `---------------------------`,
                `🏢 <b>Fornecedor:</b> ${rawResult.cabecalho?.fornecedor || 'N/A'}`,
                `📄 <b>Nota Nº:</b> ${rawResult.cabecalho?.numero_nota || 'N/A'}`,
                `🔑 <b>Chave:</b> <code>${rawResult.chave_acesso || 'Não detectada'}</code>`,
                `---------------------------`,
            ];

            if (rawResult.produtos && rawResult.produtos.length > 0) {
                lines.push(`📦 <b>Produtos na Nota:</b>`);
                rawResult.produtos.forEach((p: any) => {
                    const diff = Math.abs(currentPesagem - p.quantidade);
                    const alert = (diff > 0.5 && currentPesagem > 0) ? ` ⚠️ (Pesagem: ${currentPesagem}kg)` : '';
                    lines.push(`• ${p.descricao}: <b>${p.quantidade}kg</b> ${alert}`);
                });
                lines.push(`---------------------------`);
            }

            if (currentPesagem > 0) {
                lines.push(`⚖️ <b>Status da Pesagem Local:</b> ${currentPesagem}kg`);
            }

            if (!supabase) throw new Error('Supabase offline');

            // Llamamos a nfe-extractor (para decodificar la clave y avisar) o danfe-telegram para el mensaje rico
            // Optamos por danfe-telegram porque permite mensajes personalizados más complejos
            await supabase.functions.invoke('danfe-telegram', {
                body: { 
                    message: lines.join('\n'),
                    imageBase64: resized 
                }
            });

            // 4. Mapear datos para el formulario de la App
            const finalMapped = {
                supplier: rawResult.cabecalho?.fornecedor || '',
                cnpj: rawResult.cabecalho?.cnpj_emitente || '',
                noteNumber: rawResult.cabecalho?.numero_nota || '',
                grossWeight: rawResult.cabecalho?.peso_bruto || null,
                totalWeight: rawResult.cabecalho?.peso_liquido || null,
                evidence: resized,
                // Si hay un solo producto dominante, podemos pre-rellenarlo
                product: rawResult.produtos?.[0]?.descricao || ''
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
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in text-white text-center">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {step === 'capture' && (
                    <div className="p-10">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <FileText className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-2">Processador Unificado NF-e</h2>
                        <p className="text-xs text-zinc-400 mb-8">Extração de Chave, Cabeçalho e Produtos em uma única foto.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => cameraRef.current?.click()} className="p-6 bg-blue-600 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all">
                                <Camera className="w-8 h-8" />
                                <span className="text-[10px] font-black uppercase">Câmera</span>
                            </button>
                            <button onClick={() => galleryRef.current?.click()} className="p-6 bg-zinc-800 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all border border-zinc-700">
                                <Search className="w-8 h-8" />
                                <span className="text-[10px] font-black uppercase">Galeria</span>
                            </button>
                        </div>
                        <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                        <input ref={galleryRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                    </div>
                )}

                {step === 'processing' && (
                    <div className="p-10 flex flex-col items-center gap-6">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{progressLabel}</span>
                    </div>
                )}

                {step === 'result' && (
                    <div className="p-10">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Check className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-black uppercase mb-2">DADOS EXTRAÍDOS!</h2>
                        <p className="text-[10px] text-zinc-400 mb-6">O formulário foi preenchido e o Telegram notificado com sucesso.</p>
                        <button onClick={onClose} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">
                            VOLTAR AO FORMULÁRIO
                        </button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="p-10 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-sm font-bold mb-6">{errorMsg}</p>
                        <button onClick={() => setStep('capture')} className="px-8 py-3 bg-white text-black rounded-xl font-bold text-[10px] uppercase">Tentar De Novo</button>
                    </div>
                )}
            </div>
        </div>
    );
};
