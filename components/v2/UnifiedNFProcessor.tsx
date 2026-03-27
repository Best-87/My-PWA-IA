import React, { useState, useRef } from 'react';
import { Camera, Loader2, Check, X, AlertTriangle, FileText, Search } from 'lucide-react';
import { generateGeminiContent } from '../../services/geminiService';
import { supabase } from '../../services/supabaseService';

interface UnifiedNFProcessorProps {
    onClose: () => void;
    onDataCombined: (data: any) => void;
    currentPesagem: number;
}

const resizeImage = (base64Str: string, maxWidth = 1600): Promise<string> =>
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
            setProgressLabel('IA analisando documento...');

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    {
                        text: `Aja como especialista em OCR de Notas Fiscais brasileiras (DANFE). Analise a imagem com precisão máxima.

Extraia cabeçalho da nota e todos os itens da tabela de produtos. 

RETORNE JSON ÚNICO:
{
  "chave_acesso": "44 dígitos ou null",
  "cabecalho": {
    "cnpj_emitente": "XX.XXX.XXX/XXXX-XX",
    "numero_nota": "string",
    "peso_bruto_total": 0.0,
    "peso_liquido_total": 0.0,
    "quantidade_volumes": 0.0,
    "fornecedor": "string"
  },
  "productos": [
    {
      "descricao": "NOME DO ITEM",
      "unidade": "KG/CX/UN",
      "quantidade_unidades": 0.0,
      "peso_total_kg": 0.0
    }
  ]
}

REGRAS DE OURO:
1. PESOS DO CABEÇALHO: No quadro 'DADOS DOS TRANSPORTES / VOLUMES', extraia rigorosamente 'PESO BRUTO', 'PESO LÍQUIDO' e 'QUANTIDADE' (volumes totais).
2. DEDUÇÃO DE VOLUMES (CRÍTICO):
   - Se a Unidade (UN) for 'KG' e a descrição indicar 'CX XX KG' (ex: CX 20 KG), a 'quantidade_unidades' DEVE SER o cálculo: (QUANT / XX). Ex: Se QUANT é 200.00 e diz 'CX 20 KG', retorne quantidade_unidades: 10.
   - Se a Unidade (UN) for 'CX', 'UN' ou 'PC', a 'quantidade_unidades' é o valor da coluna QUANT diretamente.
3. PESO TOTAL ITEM: 'peso_total_kg' deve ser o peso líquido total daquele item. 
   - Se UN for 'KG', peso_total_kg é RIGOROSAMENTE o valor da coluna QUANT. Nunca multiplique.
   - Se UN for 'CX/UN/PC', procure o peso na descrição (ex: 'CX 20 KG' con QUANT 1 -> 20 kg) o use a proporção.
4. CONSISTÊNCIA: A soma de 'quantidade_unidades' de todos os itens deve ser igual à 'QUANTIDADE' de volumes do cabeçalho.
5. Números BR (1.250,50) para US (1250.50). No markdown. No text outside JSON. `
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
            const rawResult = JSON.parse(cleanJson.substring(start, end + 1));

            const processedProducts = (rawResult.productos || []).map((p: any) => {
                let weight = parseFloat(p.peso_total_kg) || 0;
                const qty = parseFloat(p.quantidade_unidades) || 0;
                
                // Fallback: Si el peso del producto es 0 pero hay peso líquido total en el encabezado
                // y es el único producto o se detecta como peso válido para el item.
                if (weight === 0 && rawResult.cabecalho?.peso_liquido_total > 0) {
                   weight = rawResult.cabecalho.peso_liquido_total;
                }

                // Si la unidad es KG y el peso está vacío, usamos la cantidad directamente
                if (weight === 0 && qty > 0 && (p.unidade === 'KG' || p.unidade === 'KGS' || p.unidade === 'QUILOS')) {
                    weight = qty;
                }
                return { 
                    ...p, 
                    peso_total_kg: weight, 
                    quantidade_unidades: qty 
                };
            });

            setProgress(85);
            setProgressLabel('Enviando relatório...');

            const lines = [
                `<b>🚀 NF-e Processada</b>`,
                `🏢 <b>Fornecedor:</b> ${rawResult.cabecalho?.fornecedor || 'N/A'}`,
                `📄 <b>Nota Nº:</b> ${rawResult.cabecalho?.numero_nota || 'N/A'}`,
                `🔑 <b>Chave:</b> <code>${rawResult.chave_acesso || 'Não detectada'}</code>`,
            ];

            if (rawResult.chave_acesso?.length === 44) {
                lines.push(`🔗 <a href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${rawResult.chave_acesso}">Ver na SEFAZ</a>`);
            }

            if (processedProducts.length > 0) {
                lines.push(`📦 <b>Produtos:</b>`);
                processedProducts.forEach((p: any) => {
                    const weight = p.peso_total_kg || 0;
                    const diff = Math.abs(currentPesagem - weight);
                    const alert = (diff > 0.5 && currentPesagem > 0) ? ' ⚠️' : '';
                    lines.push(`• ${p.descricao}: <b>${weight > 0 ? weight + 'kg' : 'N/A'}</b> (Qtd: ${p.quantidade_unidades || '?'})${alert}`);
                });
            }

            if (!supabase) throw new Error('Supabase offline');

            await supabase.functions.invoke('danfe-telegram', {
                body: { message: lines.join('\n'), imageBase64: resized }
            });

            onDataCombined({
                supplier: rawResult.cabecalho?.fornecedor || '',
                cnpj: rawResult.cabecalho?.cnpj_emitente || '',
                noteNumber: rawResult.cabecalho?.numero_nota || '',
                accessKey: rawResult.chave_acesso || '',
                grossWeight: rawResult.cabecalho?.peso_bruto_total || null,
                totalWeight: rawResult.cabecalho?.peso_liquido_total || null,
                evidence: resized,
                product: processedProducts[0]?.descricao || '',
                noteWeight: processedProducts[0]?.peso_total_kg || null,
                qty: (processedProducts[0]?.quantidade_unidades > 0) 
                    ? processedProducts[0].quantidade_unidades 
                    : (rawResult.cabecalho?.quantidade_volumes || null),
                products: processedProducts
            });

            setProgress(100);
            setStep('result');

            // Auto-close after success
            setTimeout(() => onClose(), 1800);

        } catch (err: any) {
            console.error('UnifiedProcessor error:', err);
            setErrorMsg(err.message || 'Erro ao processar');
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
        <div className="fixed inset-0 z-[500] flex flex-col justify-end">
            {/* Transparent overlay — tap to dismiss when idle */}
            <div className="absolute inset-0" onClick={step === 'capture' ? onClose : undefined} />

            {/* Sheet */}
            <div className="relative animate-slide-up">
                <div className="mx-3 mb-3 bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xl">

                    {/* Accent stripe */}
                    <div className="h-1 w-full bg-blue-600" />

                    {/* Handle */}
                    <div className="flex justify-center py-3">
                        <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>

                    {/* Close btn */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* ── CAPTURE ── */}
                    {step === 'capture' && (
                        <div className="px-6 pb-8 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4">
                                <FileText className="w-7 h-7 text-blue-500" />
                            </div>
                            <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-0.5">
                                Processador NF-e
                            </h2>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-3">DANFE — EXTRAÇÃO INTELIGENTE</p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[240px] leading-relaxed mb-6">
                                Fotografe a nota fiscal. A IA extrai chave de acesso, CNPJ, pesos e produtos.
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => cameraRef.current?.click()}
                                    className="flex flex-col items-center gap-2 py-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    <Camera className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
                                </button>
                                <button
                                    onClick={() => galleryRef.current?.click()}
                                    className="flex flex-col items-center gap-2 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
                                >
                                    <Search className="w-6 h-6 opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
                                </button>
                            </div>
                            <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCapture} />
                            <input ref={galleryRef} type="file" className="hidden" accept="image/*" onChange={handleCapture} />
                        </div>
                    )}

                    {/* ── PROCESSING ── */}
                    {step === 'processing' && (
                        <div className="px-4 pb-6">
                            {preview && (
                                <div className="relative rounded-2xl overflow-hidden bg-zinc-950 mb-4" style={{ aspectRatio: '16/9' }}>
                                    <img src={preview} className="w-full h-full object-cover" style={{ opacity: 0.35 }} alt="" />
                                    {/* Scan line */}
                                    <div className="animate-scan-line bg-blue-500 opacity-80" style={{ boxShadow: '0 0 10px rgba(59,130,246,0.8)' }} />
                                    {/* Corner brackets */}
                                    <div className="absolute inset-3 pointer-events-none">
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-blue-400 rounded-tl" />
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-blue-400 rounded-tr" />
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-blue-400 rounded-bl" />
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-blue-400 rounded-br" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2 px-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                        {progressLabel || 'Processando...'}
                                    </span>
                                    <span className="text-[9px] font-black text-blue-500">{progress}%</span>
                                </div>
                                <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS ── */}
                    {step === 'result' && (
                        <div className="px-6 pb-8 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                <Check className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Extração Concluída</h2>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[240px]">
                                Formulário preenchido automaticamente. Fechando...
                            </p>
                        </div>
                    )}

                    {/* ── ERROR ── */}
                    {step === 'error' && (
                        <div className="px-6 pb-8 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Não foi possível extrair</h2>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6 max-w-[240px]">{errorMsg}</p>
                            <button
                                onClick={() => setStep('capture')}
                                className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
