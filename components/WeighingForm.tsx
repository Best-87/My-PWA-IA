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
    const [grossWeight, setGrossWeight] = useState<string>(''); // Stores raw string like "100, 200"
    const [noteWeight, setNoteWeight] = useState<string>('');
    const [evidence, setEvidence] = useState<string | null>(null); // Base64 image
    
    // Collapsible sections
    const [showBoxes, setShowBoxes] = useState(false);
    const [boxQty, setBoxQty] = useState<string>('');
    const [boxTara, setBoxTara] = useState<string>(''); // Stores strictly integer string (grams)
    
    // UI State for Modal
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    // Additional extracted metadata for smart tips
    const [storageType, setStorageType] = useState<'frozen' | 'refrigerated' | 'dry' | null>(null);
    const [recommendedTemp, setRecommendedTemp] = useState<string>('');
    const [criticalWarning, setCriticalWarning] = useState<string | null>(null);
    
    // Refs for auto-focus and file inputs
    const noteInputRef = useRef<HTMLInputElement>(null);
    const grossInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    
    // Ref to block history auto-fill when AI is populating data
    const isAiPopulating = useRef(false);

    // Suggestions & AI Context
    const [suggestions, setSuggestions] = useState<{products: string[], suppliers: string[]}>({products: [], suppliers: []});
    const [prediction, setPrediction] = useState<{suggestedProduct?: string; suggestedTaraBox?: number;}>({});
    const [historyContext, setHistoryContext] = useState<string | null>(null);
    const [assistantMessage, setAssistantMessage] = useState("");
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReadingImage, setIsReadingImage] = useState(false);
    const [aiAlert, setAiAlert] = useState<string | null>(null);

    // Smart Tips Carousel State
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Track active sections for styling
    const [activeSection, setActiveSection] = useState<'identity' | 'weights' | 'tara' | 'evidence' | null>(null);

    // Initialize Assistant Message
    useEffect(() => {
        if (!assistantMessage) setAssistantMessage(t('assistant_default'));
    }, [t]);

    // Load Knowledge Base
    useEffect(() => {
        const kb = getKnowledgeBase();
        setSuggestions({ products: kb.products, suppliers: kb.suppliers });
    }, []);

    // Auto-collapse Tara section logic
    useEffect(() => {
        // Trigger only if showBoxes is true AND boxQty has a value different from '0' (meaning user started digitizing)
        if (!showBoxes || !boxQty || boxQty === '0') return;
        
        const timer = setTimeout(() => {
            setShowBoxes(false);
            setActiveSection('weights');
            if (!noteWeight) noteInputRef.current?.focus();
            else grossInputRef.current?.focus();
        }, 5000); // 5 seconds timeout
        return () => clearTimeout(timer);
    }, [boxQty, showBoxes, noteWeight]);

    // Helper function to sum comma separated strings
    const parseSum = (val: string) => {
        if (!val) return 0;
        return val.split(',').reduce((acc, curr) => {
            const clean = curr.trim();
            if (!clean) return acc;
            const v = parseFloat(clean);
            return acc + (isNaN(v) ? 0 : v);
        }, 0);
    };

    // Calculate totals from comma-separated strings
    const parsedGrossWeight = useMemo(() => parseSum(grossWeight), [grossWeight]);
    // Box Tara is now a single Integer field
    const parsedBoxTara = useMemo(() => {
        const val = parseInt(boxTara, 10);
        return isNaN(val) ? 0 : val;
    }, [boxTara]);

    // Reactive Assistant & Prediction Logic
    useEffect(() => {
        // PREVENT History from overwriting AI extracted data
        if (isAiPopulating.current) return;

        if (supplier) {
            const pred = predictData(supplier, product);
            setPrediction(pred);
            
            // Auto-fill logic when prediction exists
            if (product && pred.suggestedTaraBox) {
                setShowBoxes(true);
                // Convert stored Kg to Grams for input (Important fix: * 1000)
                const suggestedGrams = Math.round(pred.suggestedTaraBox * 1000);
                
                // Only fill if empty or 0 to avoid overwriting user edits
                if (!boxTara || boxTara === '0') {
                    setBoxTara(suggestedGrams.toString());
                    setBoxQty('0'); // Reset qty to force user input but keep tara ready
                }
            }
            
            const lastRecord = getLastRecordBySupplier(supplier);
            if (lastRecord) {
                const diff = lastRecord.netWeight - lastRecord.noteWeight;
                setHistoryContext(Math.abs(diff) > TOLERANCE_KG ? `${supplier}: last diff ${diff > 0 ? '+' : ''}${diff.toFixed(2)}kg.` : `${supplier}: OK.`);
            } else {
                setHistoryContext(null);
            }
        } else {
            setPrediction({});
            setHistoryContext(null);
        }
        updateAssistantVoice();
    }, [supplier, product]); 
    // Removed other dependencies from this specific effect to prevent loop/overwrites on typing

    // Effect for voice updates dependent on all fields
    useEffect(() => {
        updateAssistantVoice();
    }, [parsedGrossWeight, noteWeight, boxQty, parsedBoxTara, language]);

    const boxTaraKg = parsedBoxTara / 1000;
    const totalTara = (Number(boxQty) * boxTaraKg);
    const netWeight = parsedGrossWeight - totalTara;
    const difference = netWeight - (Number(noteWeight) || 0);

    const updateAssistantVoice = () => {
        if (!supplier) { setAssistantMessage(t('assistant_supplier')); return; }
        if (!product) {
            setAssistantMessage(prediction.suggestedProduct ? t('assistant_product', { product: prediction.suggestedProduct }) : t('assistant_product_ask'));
            return;
        }
        if (!noteWeight) { setAssistantMessage(t('assistant_note')); return; }
        if (!grossWeight) { setAssistantMessage(t('assistant_gross')); return; }
        if (Math.abs(difference) <= TOLERANCE_KG) {
            setAssistantMessage(t('assistant_ok'));
        } else {
            const diffVal = Math.abs(difference).toFixed(2);
            setAssistantMessage(difference > 0 ? t('assistant_high', { diff: diffVal }) : t('assistant_low', { diff: diffVal }));
        }
    };

    const checkExpirationRisk = (dateStr: string): string | null => {
        if (!dateStr) return null;
        const cleanDate = dateStr.replace(/[\.-]/g, '/').trim();
        const parts = cleanDate.split('/');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000; 
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        const expDate = new Date(year, month, day);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `⚠️ VENCIDO hace ${Math.abs(diffDays)} días`;
        if (diffDays <= 7) return `⚠️ CRÍTICO: Vence en ${diffDays} días`;
        return null;
    };

    const tips = useMemo(() => {
        const list = [];
        let riskMsg = expirationDate ? checkExpirationRisk(expirationDate) : null;
        if (criticalWarning) riskMsg = criticalWarning; 

        if (riskMsg) {
            list.push({
                id: 'critical_alert',
                icon: 'warning',
                title: t('tip_title_alert'),
                component: <span className="font-bold">{riskMsg}</span>,
                color: 'text-red-100',
                bg: 'bg-red-500/30'
            });
        }
        if (productionDate || expirationDate || batch || parsedBoxTara || recommendedTemp) {
            list.push({
                id: 'logistics_summary',
                icon: 'inventory_2',
                title: 'Datos Logísticos',
                component: (
                    <div className="flex flex-col gap-0.5 leading-snug">
                        {(productionDate || expirationDate) && (
                            <div className="flex flex-wrap gap-x-3 text-xs">
                                {productionDate && <span>F: <b>{productionDate}</b></span>}
                                {expirationDate && <span>V: <b>{expirationDate}</b></span>}
                            </div>
                        )}
                        {batch && <div className="text-xs truncate">Lote: <b className="font-mono">{batch}</b></div>}
                        {(parsedBoxTara || recommendedTemp) && (
                             <div className="flex items-center gap-3 mt-1">
                                {parsedBoxTara > 0 && <div className="text-xs bg-white/20 px-1.5 rounded flex items-center gap-1"><b>{parsedBoxTara}g</b></div>}
                                {recommendedTemp && <div className="text-xs flex items-center gap-1 text-cyan-200 font-bold"><span className="material-icons-round text-[10px]">thermostat</span>{recommendedTemp}</div>}
                             </div>
                        )}
                    </div>
                ),
                color: 'text-white'
            });
        }
        if (storageType || recommendedTemp) {
             const isFrozen = storageType === 'frozen';
             list.push({
                id: 'storage',
                icon: isFrozen ? 'ac_unit' : 'thermostat',
                title: t('tip_title_storage'),
                component: (
                    <div className="flex flex-col">
                        <span>{isFrozen ? t('tip_frozen') : t('tip_chilled')}</span>
                        {recommendedTemp && <span className="text-xs font-bold mt-1 bg-white/20 px-2 py-0.5 rounded self-start">Ideal: {recommendedTemp}</span>}
                    </div>
                ),
                color: isFrozen ? 'text-cyan-100' : 'text-blue-100'
            });
        }
        if (list.length === 0 || (!product && list.length < 2)) {
            list.push({
                id: 'assistant',
                icon: isReadingImage ? 'qr_code_scanner' : 'assistant',
                title: isReadingImage ? t('lbl_analyzing_img') : t('app_name'),
                component: <span>{isReadingImage ? t('lbl_analyzing_img') : assistantMessage}</span>,
                color: 'text-white'
            });
        }
        return list;
    }, [assistantMessage, aiAlert, product, historyContext, isReadingImage, t, expirationDate, productionDate, batch, storageType, recommendedTemp, criticalWarning, totalTara, boxQty, parsedBoxTara]);

    useEffect(() => {
        if (tips.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentTipIndex(prev => (prev + 1) % tips.length);
        }, isReadingImage ? 2000 : 8000); 
        return () => clearInterval(interval);
    }, [tips.length, isReadingImage]);

    useEffect(() => {
        if (tips.length > 0) {
            const alertIdx = tips.findIndex(t => t.id === 'critical_alert');
            const summaryIdx = tips.findIndex(t => t.id === 'logistics_summary');
            if (alertIdx !== -1) setCurrentTipIndex(alertIdx);
            else if (summaryIdx !== -1) setCurrentTipIndex(summaryIdx);
        }
    }, [tips.length, criticalWarning, expirationDate, totalTara, recommendedTemp]);

    useEffect(() => {
        if (currentTipIndex >= tips.length) setCurrentTipIndex(0);
    }, [tips.length]);

    // Added safety fallback for activeTip
    const activeTip = tips[currentTipIndex] || tips[0] || {
        id: 'fallback',
        icon: 'error',
        title: 'Loading',
        component: <span>...</span>,
        color: 'text-white',
        bg: 'bg-white/10'
    };

    const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > 50) setCurrentTipIndex(prev => (prev + 1) % tips.length);
        if (distance < -50) setCurrentTipIndex(prev => (prev - 1 + tips.length) % tips.length);
        setTouchStart(null);
        setTouchEnd(null);
    };

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
        // OFFLINE CHECK
        if (!navigator.onLine) {
            setAiAlert("Modo Offline: IA no disponible.");
            return;
        }

        setIsReadingImage(true);
        // LOCK AI Populating to prevent useEffect history overwrite
        isAiPopulating.current = true;
        
        setAiAlert(null);
        setCriticalWarning(null);
        setStorageType(null);
        setRecommendedTemp('');
        
        try {
            // INITIALIZE HERE to ensure process.env is read at execution time
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API Key faltante. Verifique configuración.");
            
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `Analyze this product label image for logistics. Extract readable text and return strictly valid JSON.
            Fields:
            - supplier (string)
            - product (string)
            - expiration (DD/MM/YYYY)
            - production (DD/MM/YYYY)
            - batch (string)
            - tara: Weight of the empty packaging/box in GRAMS (Integer).
              LOGIC TO FIND TARA (Priority Order):
              1. Calculation: If "Peso Bruto" (Gross) and "Peso Líquido/Neto" (Net) exist, SUBTRACT: Tara = Gross - Net.
              2. Explicit Label: Look for "Tara", "T.", "Peso Emb.", "Caja", "Descarte".
              3. Inference: If a small weight (e.g., 50g, 400g, 1.2kg) is listed separately from the main net weight, it is likely the tara.
              4. Standardize: Convert ALL results to GRAMS (e.g. 1.2kg -> 1200).
            - storage (frozen, refrigerated, dry)
            - temperature_range (string)
            - warning (string)
            
            Return ONLY the JSON object.`;

            // Clean base64 data to ensure no prefixes interfere
            const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
            
            // TIMEOUT PROTECTION: 25s
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 25000)
            );

            const apiCall = ai.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: 'application/json'
                }
            });

            // Force cast to any to avoid TS race condition strictness
            const response = await Promise.race([apiCall, timeoutPromise]) as any;

            const text = response.text;
            if (!text) {
                 if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                     throw new Error("Contenido bloqueado por seguridad.");
                 }
                 throw new Error("Respuesta vacía del modelo.");
            }

            // Robust JSON extraction
            let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) jsonString = jsonString.substring(firstBrace, lastBrace + 1);

            const data = JSON.parse(jsonString);
            
            // Batch updates
            if (data.supplier && !supplier) setSupplier(data.supplier);
            if (data.product && !product) setProduct(data.product);
            if (data.batch && !batch) setBatch(data.batch);
            if (data.expiration && !expirationDate) setExpirationDate(data.expiration);
            if (data.production && !productionDate) setProductionDate(data.production);
            if (data.storage) setStorageType(data.storage);
            if (data.temperature_range) setRecommendedTemp(data.temperature_range);
            if (data.warning) setCriticalWarning(data.warning);
            
            let normalizedTara: string | null = null;
            
            if (data.tara) {
                // Parse float first to catch "0.5" etc.
                let val = parseFloat(String(data.tara));
                if (!isNaN(val)) {
                    // Logic: if small (< 20), likely kg -> convert to g. else assume g.
                    if (val < 20) val = val * 1000;
                    // FORCE INTEGER: Round to remove decimals
                    normalizedTara = Math.round(val).toString();
                }
            }
            
            // Force update if we found a tara and the field is empty OR currently 0
            if (normalizedTara) {
                setBoxTara(normalizedTara);
                if (!boxQty || boxQty === '0') setBoxQty('0'); 
                setShowBoxes(true);
            }

        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            let errMsg = "Error al leer imagen.";
            if (error.message?.includes("Timeout")) errMsg = "Tiempo agotado (Red lenta).";
            else if (error.message?.includes("API Key")) errMsg = "Falta API Key.";
            else if (error.message?.includes("SAFETY")) errMsg = "Imagen bloqueada (Seguridad).";
            else if (error.message?.includes("fetch")) errMsg = "Sin conexión.";
            else if (error.message?.includes("JSON")) errMsg = "Error formato datos.";
            
            setAiAlert(errMsg);
        } finally {
            setIsReadingImage(false);
            // Allow effects to resume after a short delay
            setTimeout(() => { isAiPopulating.current = false; }, 1500);
        }
    };

    const getStatusColor = () => {
        if (tips.length > 0 && tips[currentTipIndex]?.id === 'critical_alert') return 'from-red-600 to-orange-700 text-white shadow-lg shadow-red-500/30 animate-pulse-slow';
        if (!parsedGrossWeight || !noteWeight) return 'from-black/80 to-zinc-900/90 backdrop-blur-xl text-white border-zinc-700';
        if (Math.abs(difference) <= TOLERANCE_KG) return 'from-emerald-900/90 to-emerald-950/90 backdrop-blur-xl text-white shadow-lg shadow-emerald-500/10 border-emerald-800';
        return 'from-red-900/90 to-red-950/90 backdrop-blur-xl text-white shadow-lg shadow-red-500/10 border-red-800';
    };

    const handleReset = () => {
        setSupplier(''); setProduct(''); setBatch(''); setExpirationDate(''); setProductionDate('');
        setGrossWeight(''); setNoteWeight(''); setBoxQty(''); setBoxTara(''); setEvidence(null);
        setAiAlert(null); setStorageType(null); setRecommendedTemp(''); setCriticalWarning(null);
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
        handleReset();
        trackEvent('weighing_saved', { netWeight });
        const kb = getKnowledgeBase();
        setSuggestions({ products: kb.products, suppliers: kb.suppliers });
        showToast(t('alert_saved'), 'success');
        
        // Trigger local notification for confirmation
        sendLocalNotification(
            'Registro Guardado', 
            `${supplier} - ${product}: ${netWeight.toFixed(3)}kg (Dif: ${difference > 0 ? '+' : ''}${difference.toFixed(3)})`
        );
    };

    useImperativeHandle(ref, () => ({
        save: handleSave,
        clear: () => setShowConfirmReset(true),
        openCamera: () => cameraInputRef.current?.click(),
        openGallery: () => galleryInputRef.current?.click()
    }));

    const analyzeWithAI = async () => {
        // OFFLINE CHECK
        if (!navigator.onLine) {
            setAiAlert("Modo Offline: IA no disponible.");
            return;
        }

        setIsAnalyzing(true);
        try {
            // INITIALIZE HERE to ensure process.env is read at execution time
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("Missing API Key");
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `Act as a logistics supervisor. Context: User Language ${t('ai_prompt_lang')}. Answer in ${t('ai_prompt_lang')}. Info: Supplier: ${supplier}, Product: ${product}, Diff: ${difference.toFixed(2)}. Check weight tolerance (+/- 200g) and Expiration Date vs Current Date. Output: Short action instruction.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setAiAlert(response.text?.trim() || "Revisado.");
        } catch (e: any) { 
            console.error(e);
            let msg = "Offline.";
            if (e.message?.includes("API Key")) msg = "Err: API Key";
            setAiAlert(msg); 
        } finally { setIsAnalyzing(false); }
    };

    const getSectionStyle = (section: string) => {
        const isActive = activeSection === section;
        const hasData = section === 'identity' ? (supplier || product) : section === 'weights' ? (grossWeight || noteWeight) : section === 'evidence' ? !!evidence : (showBoxes || prediction.suggestedTaraBox);
        if (isActive) return 'bg-white dark:bg-zinc-900 border-primary-500 ring-4 ring-primary-500/5 shadow-xl scale-[1.01] z-10';
        if (hasData) return 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm';
        return 'bg-zinc-50 dark:bg-zinc-900/50 border-transparent';
    };

    // Common Input Class
    const inputClass = "w-full bg-zinc-100 dark:bg-zinc-800/80 border-0 rounded-2xl px-5 py-4 text-zinc-900 dark:text-white font-semibold outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-inner";
    
    // Style for suggested fields
    const suggestionClass = "ring-2 ring-purple-500/50 border-purple-500 dark:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-pulse";

    const hasDataToSave = !!(supplier && product && grossWeight && noteWeight);

    return (
        <div className="space-y-4 relative pb-32">
            
            {/* Top Status Header (Weight/Diff) - Kept as requested in previous turn, but standard nav replaced */}
            <div className={`sticky top-20 z-40 p-5 rounded-[2.5rem] shadow-2xl transition-all duration-500 bg-gradient-to-br ${getStatusColor()} border border-white/10 backdrop-blur-xl overflow-hidden group mx-1`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-3 select-none touch-pan-y min-h-[3.5rem]" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                         <div className={`w-12 h-12 rounded-2xl backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner transition-colors duration-500 ${activeTip.bg || 'bg-white/10'}`}>
                            <span className="material-icons-round text-2xl pointer-events-none text-white transition-all duration-500">{activeTip.icon}</span>
                         </div>
                         <div className="flex-1 overflow-hidden relative pt-1">
                             <div className={`flex flex-col justify-center relative transition-all duration-300`}>
                                 {activeTip.id !== 'assistant' && <span className={`text-[10px] uppercase font-black tracking-widest mb-1 ${activeTip.color || 'text-white/80'}`}>{activeTip.title}</span>}
                                 <div className="text-sm font-medium opacity-95 text-white leading-snug">
                                    {isReadingImage ? <span className="animate-pulse">{t('lbl_analyzing_img')}</span> : (activeTip.component || activeTip.text)}
                                 </div>
                             </div>
                             {tips.length > 1 && (
                                 <div className="flex gap-1.5 mt-2.5">
                                    {tips.map((_, idx) => ( <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentTipIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} /> ))}
                                 </div>
                             )}
                         </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-white/10 pt-3 mt-1">
                        <div className="text-white">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 font-black mb-0.5 block">Líquido</span>
                            <div className="text-3xl font-black tracking-tighter font-mono leading-none flex items-baseline">
                                {netWeight.toFixed(3)}<span className="text-sm opacity-60 ml-1 font-sans font-bold">kg</span>
                            </div>
                        </div>
                        <div className="text-right text-white">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 font-black mb-0.5 block">Diferencia</span>
                            <div className={`text-xl font-bold font-mono bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm inline-block border border-white/10 ${Math.abs(difference) > TOLERANCE_KG ? 'animate-pulse' : ''}`}>
                                {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                            </div>
                        </div>
                    </div>

                    {!aiAlert && Math.abs(difference) > TOLERANCE_KG && (
                         <button onClick={analyzeWithAI} disabled={isAnalyzing} className="mt-3 w-full py-3 bg-white hover:bg-zinc-100 text-zinc-900 rounded-2xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                             {isAnalyzing ? <span className="animate-spin material-icons-round text-sm pointer-events-none">refresh</span> : <span className="material-icons-round text-sm pointer-events-none">analytics</span>}
                             {isAnalyzing ? t('btn_analyzing') : t('btn_consult_ai')}
                         </button>
                     )}
                </div>
            </div>

            {/* Evidence Section - Compact Thumbnail Row Style */}
            {evidence && (
                <div className={`rounded-xl relative overflow-hidden group transition-all duration-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center h-20 pl-2 pr-4 gap-4 ${activeSection === 'evidence' ? 'ring-2 ring-primary-500/20' : ''}`} onClick={() => setActiveSection('evidence')}>
                     <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-700">
                         <img src={evidence} alt="Evidence" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-primary-500/10 animate-pulse pointer-events-none"></div>
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">IA Live Feed</span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">
                            {t('lbl_analyzing_img')}
                        </div>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); setEvidence(null); setAiAlert(null); setIsReadingImage(false); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <span className="material-icons-round text-base">close</span>
                    </button>
                </div>
            )}
            
            {/* Hidden Inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Form Sections */}
            <div className={`rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${getSectionStyle('identity')}`} onFocus={() => setActiveSection('identity')}>
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{t('lbl_identity')}</span>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">store</span>
                                <input list="suppliers" type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder={t('ph_supplier')} className={inputClass + " pl-12 text-sm"} />
                                <datalist id="suppliers">{suggestions.suppliers.map(s => <option key={s} value={s} />)}</datalist>
                            </div>
                            <div className="relative group">
                                <span className={`absolute left-4 top-4 material-icons-round text-lg transition-colors pointer-events-none ${prediction.suggestedProduct && !product ? 'text-purple-500 animate-pulse' : 'text-zinc-400 dark:text-zinc-500 group-focus-within:text-primary-500'}`}>inventory_2</span>
                                <input list="products" type="text" value={product} onChange={e => setProduct(e.target.value)} placeholder={t('ph_product')} className={`${inputClass} pl-12 text-sm ${prediction.suggestedProduct && !product ? suggestionClass : ''}`} />
                                <datalist id="products">{suggestions.products.map(p => <option key={p} value={p} />)}</datalist>
                            </div>
                        </div>
                        {prediction.suggestedProduct && !product && (
                             <button onClick={() => setProduct(prediction.suggestedProduct!)} className="w-full animate-fade-in text-left px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-primary-300 dark:border-primary-700 rounded-2xl flex items-center justify-between group hover:bg-white dark:hover:bg-zinc-800 transition-all">
                                <span className="text-xs text-primary-700 dark:text-primary-300">{t('btn_suggestion', {supplier})}<br/><span className="font-bold text-sm">{prediction.suggestedProduct}</span></span>
                                <span className="material-icons-round text-primary-500 group-hover:scale-110 transition-transform pointer-events-none bg-white dark:bg-zinc-900 rounded-full p-1.5 shadow-sm">add</span>
                            </button>
                        )}
                        <div className="relative group">
                             <span className="absolute left-5 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-xl group-focus-within:text-primary-500 transition-colors pointer-events-none">qr_code_2</span>
                             <input type="text" value={batch} onChange={e => setBatch(e.target.value)} placeholder={t('ph_batch')} className={inputClass + " pl-14"} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">factory</span>
                                <input type="text" value={productionDate} onChange={e => setProductionDate(e.target.value)} placeholder={t('ph_production')} className={inputClass + " pl-12 text-sm"} />
                            </div>
                            <div className="relative group">
                                <span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">event_busy</span>
                                <input type="text" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} placeholder={t('ph_expiration')} className={inputClass + " pl-12 text-sm"} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${getSectionStyle('weights')}`} onFocus={() => setActiveSection('weights')}>
                <div className="p-8 space-y-4">
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{t('lbl_weighing')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                            <span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">description</span>
                            <input ref={noteInputRef} type="number" inputMode="decimal" step="0.01" value={noteWeight} onChange={e => setNoteWeight(e.target.value)} placeholder={t('lbl_note_weight')} className={inputClass + " pl-12 text-sm"} />
                        </div>
                        <div className="relative group">
                            {parsedGrossWeight > 0 && <div className="absolute -top-3 right-3 z-20 bg-emerald-500 dark:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-lg animate-fade-in flex items-center gap-1">{parsedGrossWeight.toFixed(2)} kg</div>}
                            <span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">scale</span>
                            <input ref={grossInputRef} type="text" inputMode="decimal" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} placeholder={t('lbl_gross_weight')} className={inputClass + " pl-12 text-sm"} />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${getSectionStyle('tara')} ${prediction.suggestedTaraBox ? suggestionClass : ''}`} onFocus={() => setActiveSection('tara')}>
                <div className="px-8 py-4 cursor-pointer flex justify-between items-center" onClick={() => setShowBoxes(!showBoxes)}>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase tracking-widest ${prediction.suggestedTaraBox ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400 dark:text-zinc-500'}`}>{t('lbl_tara_section')}</span>
                        {totalTara > 0 && <div className="flex items-center gap-1"><span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"><span>📦</span>{boxQty} x {parsedBoxTara.toFixed(0)}g</span><span className="text-xs font-bold text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded-md">-{totalTara.toFixed(3)} kg</span></div>}
                        {prediction.suggestedTaraBox && <span className="material-icons-round text-purple-500 text-sm animate-bounce">smart_toy</span>}
                    </div>
                    <span className={`material-icons-round text-zinc-400 transition-transform ${showBoxes ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                {showBoxes && (
                    <div className="px-8 pb-8 pt-0 animate-slide-down">
                        {prediction.suggestedTaraBox && (
                            <div className="mb-6 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl p-3 flex items-center justify-between">
                                <div className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2"><span className="material-icons-round text-sm">smart_toy</span>{t('lbl_ai_pattern')}</div>
                                <button onClick={() => { setBoxTara(Math.round(prediction.suggestedTaraBox! * 1000).toString()); setBoxQty('0'); }} className="text-[10px] font-bold bg-white dark:bg-purple-800/50 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all text-purple-700 dark:text-purple-200">{t('btn_apply_tara', { supplier, weight: Math.round(prediction.suggestedTaraBox! * 1000).toString() })}</button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group"><span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">fitness_center</span><input type="tel" inputMode="numeric" pattern="[0-9]*" value={boxTara} onChange={e => setBoxTara(e.target.value.replace(/[^0-9]/g, ''))} className={inputClass + " pl-12 text-sm"} placeholder={t('lbl_unit_weight')} /></div>
                            <div className="relative group"><span className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 material-icons-round text-lg group-focus-within:text-primary-500 transition-colors pointer-events-none">tag</span><input type="tel" inputMode="numeric" pattern="[0-9]*" value={boxQty} onChange={e => setBoxQty(e.target.value.replace(/[^0-9]/g, ''))} className={inputClass + " pl-12 text-sm"} placeholder={t('lbl_qty')} /></div>
                        </div>
                    </div>
                )}
            </div>

            {/* OPTIMIZED DYNAMIC ISLAND (Bottom Bar) */}
            <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 p-2.5 bg-[#1C1C1E] rounded-[3rem] shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-slide-up select-none pointer-events-auto">
                    
                    {/* 1. Main Action: Weigh */}
                    <div className="bg-white text-black px-6 py-4 rounded-full flex items-center gap-2.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer group" onClick={() => setActiveSection('weights')}>
                        <span className="material-icons-round text-xl group-hover:rotate-12 transition-transform">scale</span>
                        <span className="font-bold text-sm tracking-tight">{t('tab_weigh')}</span>
                    </div>

                    {/* 2. History */}
                    <button onClick={onViewHistory} className="w-12 h-12 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                        <span className="material-icons-round text-xl">history</span>
                    </button>

                    {/* Vertical Separator */}
                    <div className="w-[1px] h-6 bg-white/10 mx-0.5"></div>

                    {/* 3. Camera */}
                    <button onClick={() => cameraInputRef.current?.click()} className="w-12 h-12 rounded-full bg-[#2C2C2E] flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all active:scale-90 shadow-inner group">
                        <span className="material-icons-round text-xl group-hover:text-blue-400 transition-colors">photo_camera</span>
                    </button>

                    {/* 4. Gallery */}
                    <button onClick={() => galleryInputRef.current?.click()} className="w-12 h-12 rounded-full bg-[#2C2C2E] flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all active:scale-90 shadow-inner group">
                        <span className="material-icons-round text-xl group-hover:text-purple-400 transition-colors">collections</span>
                    </button>

                    {/* Vertical Separator */}
                    <div className="w-[1px] h-6 bg-white/10 mx-0.5"></div>

                    {/* 5. Trash / Clear */}
                    <button onClick={() => setShowConfirmReset(true)} className="w-12 h-12 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90">
                        <span className="material-icons-round text-xl">delete</span>
                    </button>

                    {/* 6. Save */}
                    <button 
                        onClick={handleSave} 
                        className={`w-16 h-16 ml-1 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90
                            ${hasDataToSave ? 'bg-[#10B981] shadow-emerald-500/30 animate-pulse-slow hover:scale-105' : 'bg-[#10B981]/80 shadow-[#10B981]/10'}`}
                    >
                        <span className="material-icons-round text-2xl">save</span>
                    </button>
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            {showConfirmReset && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" style={{ touchAction: 'none' }}>
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-slide-up ring-1 ring-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                         <div className="flex flex-col items-center text-center pt-2">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-5 text-red-500 shadow-inner">
                                <span className="material-icons-round text-3xl">delete_forever</span>
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 leading-tight">{t('msg_confirm_clear')}</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed px-4">Esta acción no se puede deshacer. Se borrarán todos los datos del formulario actual.</p>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={() => setShowConfirmReset(false)} className="py-4 rounded-2xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">{t('btn_not_now')}</button>
                                <button onClick={() => { handleReset(); setShowConfirmReset(false); }} className="py-4 rounded-2xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">{t('btn_erase')}</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
});