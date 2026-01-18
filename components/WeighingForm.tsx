import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenAI } from "@google/genai";
import { saveRecord, predictData, getKnowledgeBase, getLastRecordBySupplier } from '../services/storageService';
import { trackEvent } from '../services/analyticsService';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';
import { sendLocalNotification } from '../services/notificationService';

// Stable tolerance
const TOLERANCE_KG = 0.2;

export interface WeighingFormHandle {
    save: () => void;
    clear: () => void;
    openCamera: () => void;
    openGallery: () => void;
}

export interface WeighingFormProps {
    onViewHistory: () => void;
}

export const WeighingForm = forwardRef<WeighingFormHandle, WeighingFormProps>(({ onViewHistory }, ref) => {
    const { t, language } = useTranslation();
    const { showToast } = useToast();

    // Form State
    const [supplier, setSupplier] = useState('');
    const [product, setProduct] = useState('');
    const [batch, setBatch] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [productionDate, setProductionDate] = useState('');
    const [grossWeight, setGrossWeight] = useState<string>(''); 
    const [noteWeight, setNoteWeight] = useState<string>('');
    const [evidence, setEvidence] = useState<string | null>(null); 
    
    // Collapsible sections
    const [showBoxes, setShowBoxes] = useState(false);
    const [boxQty, setBoxQty] = useState<string>('');
    const [boxTara, setBoxTara] = useState<string>(''); 
    
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [storageType, setStorageType] = useState<'frozen' | 'refrigerated' | 'dry' | null>(null);
    const [recommendedTemp, setRecommendedTemp] = useState<string>('');
    const [criticalWarning, setCriticalWarning] = useState<string | null>(null);
    
    const noteInputRef = useRef<HTMLInputElement>(null);
    const grossInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    
    const isAiPopulating = useRef(false);

    const [suggestions, setSuggestions] = useState<{products: string[], suppliers: string[]}>({products: [], suppliers: []});
    const [prediction, setPrediction] = useState<{suggestedProduct?: string; suggestedTaraBox?: number;}>({});
    const [historyContext, setHistoryContext] = useState<string | null>(null);
    const [assistantMessage, setAssistantMessage] = useState("");
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReadingImage, setIsReadingImage] = useState(false);
    const [aiAlert, setAiAlert] = useState<string | null>(null);

    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const [activeSection, setActiveSection] = useState<'identity' | 'weights' | 'tara' | 'evidence' | null>(null);

    useEffect(() => {
        if (!assistantMessage) setAssistantMessage(t('assistant_default'));
    }, [t]);

    useEffect(() => {
        const kb = getKnowledgeBase();
        setSuggestions({ products: kb.products, suppliers: kb.suppliers });
    }, []);

    const parseSum = (val: string) => {
        if (!val) return 0;
        return val.split(',').reduce((acc, curr) => {
            const clean = curr.trim();
            if (!clean) return acc;
            const v = parseFloat(clean);
            return acc + (isNaN(v) ? 0 : v);
        }, 0);
    };

    const parsedGrossWeight = useMemo(() => parseSum(grossWeight), [grossWeight]);
    const parsedBoxTara = useMemo(() => {
        const val = parseInt(boxTara, 10);
        return isNaN(val) ? 0 : val;
    }, [boxTara]);

    useEffect(() => {
        if (isAiPopulating.current) return;
        if (supplier) {
            const pred = predictData(supplier, product);
            setPrediction(pred);
            if (product && pred.suggestedTaraBox) {
                setShowBoxes(true);
                const suggestedGrams = Math.round(pred.suggestedTaraBox * 1000);
                if (!boxTara || boxTara === '0') {
                    setBoxTara(suggestedGrams.toString());
                    setBoxQty('0'); 
                }
            }
        }
    }, [supplier, product]);

    const boxTaraKg = parsedBoxTara / 1000;
    const totalTara = (Number(boxQty) * boxTaraKg);
    const netWeight = parsedGrossWeight - totalTara;
    const difference = netWeight - (Number(noteWeight) || 0);

    const tips = useMemo(() => {
        const list = [];
        if (criticalWarning) {
            list.push({ id: 'critical_alert', icon: 'warning', title: t('tip_title_alert'), component: <span className="font-bold">{criticalWarning}</span>, color: 'text-red-100', bg: 'bg-red-500/30' });
        }
        list.push({
            id: 'assistant',
            icon: isReadingImage ? 'qr_code_scanner' : 'assistant',
            title: isReadingImage ? t('lbl_analyzing_img') : t('app_name'),
            component: <span>{isReadingImage ? t('lbl_analyzing_img') : assistantMessage}</span>,
            color: 'text-white'
        });
        return list;
    }, [assistantMessage, isReadingImage, t, criticalWarning]);

    // Calculate activeTip from tips array
    const activeTip = tips[currentTipIndex] || tips[0];

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); 
                    setEvidence(compressedDataUrl);
                    analyzeImageContent(compressedDataUrl);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };
    
    const analyzeImageContent = async (base64Image: string) => {
        if (!navigator.onLine) {
            setAiAlert("Modo Offline: IA no disponible.");
            return;
        }

        setIsReadingImage(true);
        isAiPopulating.current = true;
        setAiAlert(null);
        
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API Key faltante.");
            
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `Analiza esta etiqueta logística. Extrae: supplier, product, expiration (DD/MM/YYYY), production (DD/MM/YYYY), batch, y tara (en GRAMOS). Devuelve JSON estrictamente.`;

            const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
            
            // TIMEOUT PROTECCIÓN extendida a 35s para redes móviles
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 35000)
            );

            const apiCall = ai.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: 'application/json' }
            });

            const response = await Promise.race([apiCall, timeoutPromise]) as any;

            if (response.text) {
                const data = JSON.parse(response.text.trim());
                if (data.supplier) setSupplier(data.supplier);
                if (data.product) setProduct(data.product);
                if (data.batch) setBatch(data.batch);
                if (data.expiration) setExpirationDate(data.expiration);
                if (data.tara) {
                    let tVal = parseFloat(data.tara);
                    if (tVal < 10) tVal *= 1000;
                    setBoxTara(Math.round(tVal).toString());
                    setShowBoxes(true);
                }
            }
        } catch (error: any) {
            console.error("AI Error:", error);
            setAiAlert(error.message === "Timeout" ? "Red lenta: Intente de nuevo." : "Error de lectura.");
        } finally {
            setIsReadingImage(false);
            setTimeout(() => { isAiPopulating.current = false; }, 1000);
        }
    };

    const handleSave = () => {
        if (!supplier || !product || !grossWeight || !noteWeight) { showToast(t('msg_validation_error'), 'error'); return; }
        saveRecord({
            id: Date.now().toString(), timestamp: Date.now(), supplier, product,
            batch: batch || undefined, expirationDate: expirationDate || undefined, productionDate: productionDate || undefined,
            grossWeight: parsedGrossWeight, noteWeight: Number(noteWeight), netWeight, taraTotal: totalTara,
            boxes: { qty: Number(boxQty), unitTara: boxTaraKg }, status: Math.abs(difference) > TOLERANCE_KG ? 'error' : 'verified',
            aiAnalysis: aiAlert || undefined, evidence: evidence || undefined, recommendedTemperature: recommendedTemp || undefined
        });
        setSupplier(''); setProduct(''); setGrossWeight(''); setNoteWeight(''); setEvidence(null);
        showToast(t('alert_saved'), 'success');
    };

    useImperativeHandle(ref, () => ({
        save: handleSave,
        clear: () => setShowConfirmReset(true),
        openCamera: () => cameraInputRef.current?.click(),
        openGallery: () => galleryInputRef.current?.click()
    }));

    const inputClass = "w-full bg-zinc-100 dark:bg-zinc-800/80 border-0 rounded-2xl px-5 py-4 text-zinc-900 dark:text-white font-semibold outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-inner";
    const hasDataToSave = !!(supplier && product && grossWeight && noteWeight);

    return (
        <div className="space-y-4 relative pb-32">
            <div className={`sticky top-20 z-40 p-5 rounded-[2.5rem] shadow-2xl transition-all duration-500 bg-gradient-to-br from-black/80 to-zinc-900/90 backdrop-blur-xl border border-white/10 mx-1`}>
                <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-3">
                         <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                            <span className="material-icons-round text-2xl text-white">{activeTip.icon}</span>
                         </div>
                         <div className="flex-1 pt-1">
                             <div className="text-sm font-medium text-white leading-snug">
                                {isReadingImage ? <span className="animate-pulse">Analizando imagen...</span> : aiAlert || assistantMessage}
                             </div>
                         </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/10 pt-3 mt-1">
                        <div className="text-white">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 font-black mb-0.5 block">Líquido</span>
                            <div className="text-3xl font-black font-mono leading-none">
                                {netWeight.toFixed(3)}<span className="text-sm opacity-60 ml-1">kg</span>
                            </div>
                        </div>
                        <div className="text-right text-white">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 font-black mb-0.5 block">Diferencia</span>
                            <div className="text-xl font-bold font-mono bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                                {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <input list="suppliers" type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder={t('ph_supplier')} className={inputClass} />
                    <input list="products" type="text" value={product} onChange={e => setProduct(e.target.value)} placeholder={t('ph_product')} className={inputClass} />
                    <datalist id="suppliers">{suggestions.suppliers.map(s => <option key={s} value={s} />)}</datalist>
                    <datalist id="products">{suggestions.products.map(p => <option key={p} value={p} />)}</datalist>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={noteWeight} onChange={e => setNoteWeight(e.target.value)} placeholder={t('lbl_note_weight')} className={inputClass} />
                    <input type="text" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} placeholder={t('lbl_gross_weight')} className={inputClass} />
                </div>
            </div>

            <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center gap-4 pointer-events-none">
                <div className="flex items-center gap-2 p-2.5 bg-[#1C1C1E] rounded-[3rem] shadow-2xl ring-1 ring-white/10 pointer-events-auto">
                    <button onClick={() => cameraInputRef.current?.click()} className="w-12 h-12 rounded-full bg-[#2C2C2E] flex items-center justify-center text-white"><span className="material-icons-round">photo_camera</span></button>
                    <button onClick={handleSave} className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all ${hasDataToSave ? 'bg-[#10B981]' : 'bg-[#10B981]/50'}`}><span className="material-icons-round text-2xl">save</span></button>
                </div>
            </div>
        </div>
    );
});