import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { saveRecord, predictData, getKnowledgeBase, getLastRecordBySupplier } from '../services/storageService';
import { trackEvent } from '../services/analyticsService';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';
import { sendLocalNotification } from '../services/notificationService';
import { generateGeminiContent } from '../services/geminiService';
import { uploadImageToSupabase } from '../services/supabaseService';

// UI Refactor - Match iOS Reference Image
const TOLERANCE_KG = 0.2;
const MAX_WIDTH = 800;

const resizeImageToMax800 = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let w = img.width;
            let h = img.height;

            if (w > MAX_WIDTH || h > MAX_WIDTH) {
                if (w > h) {
                    h = Math.round((h * MAX_WIDTH) / w);
                    w = MAX_WIDTH;
                } else {
                    w = Math.round((w * MAX_WIDTH) / h);
                    h = MAX_WIDTH;
                }
            }

            canvas.width = w;
            canvas.height = h;
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

export interface WeighingFormHandle {
    save: () => void;
    clear: () => void;
    openCamera: () => void;
    openGallery: () => void;
    hasUnsavedData: () => boolean;
}

export interface WeighingFormProps {
    onViewHistory: () => void;
    onDataChange?: (hasData: boolean) => void;
    onRecordSaved?: () => void;
}

let persistentFormState: any = null;

const reformatProductName = (name: string): string => {
    if (!name) return '';
    const match = name.match(/\(([^)]+)\)/);
    if (match) {
        const parenthesized = match[0];
        const rest = name.replace(parenthesized, '').trim();
        return `${parenthesized} ${rest}`;
    }
    return name;
};

export const WeighingForm = forwardRef<WeighingFormHandle, WeighingFormProps>(({ onViewHistory, onDataChange, onRecordSaved }, ref) => {
    const { t, language } = useTranslation();
    const { showToast } = useToast();

    // Form states
    const [supplier, setSupplier] = useState(persistentFormState?.supplier || '');
    const [product, setProduct] = useState(persistentFormState?.product || '');
    const [batch, setBatch] = useState(persistentFormState?.batch || '');
    const [expirationDate, setExpirationDate] = useState(persistentFormState?.expirationDate || '');
    const [productionDate, setProductionDate] = useState(persistentFormState?.productionDate || '');
    const [grossWeight, setGrossWeight] = useState<string>(persistentFormState?.grossWeight || '');
    const [noteWeight, setNoteWeight] = useState<string>(persistentFormState?.noteWeight || '');
    const [evidence, setEvidence] = useState<string | null>(persistentFormState?.evidence || null);
    const [showBoxes, setShowBoxes] = useState(persistentFormState?.showBoxes || false);
    const [boxQty, setBoxQty] = useState<string>(persistentFormState?.boxQty || '');
    const [boxTara, setBoxTara] = useState<string>(persistentFormState?.boxTara || '');
    const [storageType, setStorageType] = useState<'frozen' | 'refrigerated' | 'dry' | null>(persistentFormState?.storageType || null);
    const [recommendedTemp, setRecommendedTemp] = useState<string>(persistentFormState?.recommendedTemp || '');
    const [criticalWarning, setCriticalWarning] = useState<string | null>(persistentFormState?.criticalWarning || null);

    const grossInputRef = useRef<HTMLInputElement>(null);
    const noteInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const isAiPopulating = useRef(false);

    const [suggestions, setSuggestions] = useState<{ products: string[], suppliers: string[] }>({ products: [], suppliers: [] });
    const [prediction, setPrediction] = useState<{ suggestedProduct?: string; suggestedTaraBox?: number; }>({});
    const [floatingMessage, setFloatingMessage] = useState<{ text: string, type: 'info' | 'success' | 'warning' | 'ai' } | null>(null);
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [isReadingImage, setIsReadingImage] = useState(false);
    const [carouselTip, setCarouselTip] = useState<string>("");

    // --- New Suggestion States ---
    const [standardUnitWeight, setStandardUnitWeight] = useState<number | null>(null);
    const [suggestedNote, setSuggestedNote] = useState<string | null>(null);
    const [suggestedGross, setSuggestedGross] = useState<string | null>(null);
    const [isSuggestionsDismissed, setIsSuggestionsDismissed] = useState(false);
    const [isProductFocused, setIsProductFocused] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Reset suggestions dismissed state when product/supplier changes
    useEffect(() => {
        setIsSuggestionsDismissed(false);
    }, [supplier, product]);

    // Persist state
    useEffect(() => {
        persistentFormState = {
            supplier, product, batch, expirationDate, productionDate,
            grossWeight, noteWeight, evidence, showBoxes, boxQty, boxTara,
            storageType, recommendedTemp, criticalWarning
        };
    }, [supplier, product, batch, expirationDate, productionDate, grossWeight, noteWeight, evidence, showBoxes, boxQty, boxTara, storageType, recommendedTemp, criticalWarning]);

    useEffect(() => {
        const kb = getKnowledgeBase();
        setSuggestions({ products: kb.products, suppliers: kb.suppliers });
    }, []);

    // AI Tips Carousel Logic
    useEffect(() => {
        const dynamicTips: string[] = [];
        if (expirationDate) dynamicTips.push(`📅 Vencimiento: ${expirationDate}`);
        if (productionDate) dynamicTips.push(`🏭 Fabricado el: ${productionDate}`);
        if (batch) dynamicTips.push(`🏷️ Lote activo: ${batch}`);
        if (recommendedTemp) dynamicTips.push(`🌡️ Temperatura rec: ${recommendedTemp}`);
        if (supplier) dynamicTips.push(`Proveedor: ${supplier}`);

        const rawStaticTips = t('tips_carousel', { returnObjects: true });
        const staticTips = Array.isArray(rawStaticTips) ? rawStaticTips : [];
        const tips = [...dynamicTips, ...staticTips];

        if (!carouselTip && tips.length > 0) setCarouselTip(tips[0]);
        else if (tips.length === 0) setCarouselTip(t('assistant_default'));

        let index = 0;
        const interval = setInterval(() => {
            if (!floatingMessage && !isReadingImage && tips.length > 0) {
                index = (index + 1) % tips.length;
                setCarouselTip(tips[index]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [t, floatingMessage, isReadingImage, expirationDate, productionDate, batch, recommendedTemp, supplier]);

    // --- Logic Change 2: Purple Suggestions Calculation ---
    // Replaces old auto-fill logic. Calculates expected weights but DOES NOT auto-fill.
    useEffect(() => {
        // If we have BoxQty and StandardWeight (from AI or KB), calculate expectations
        const qty = parseFloat(boxQty);

        // Also consider standard unit weight if not set but available in prediction (KB)
        // (If strict restrictions forbid modifying prediction logic, we rely on AI's standardUnitWeight or user input)
        // However, we can use the prediction from KB if available
        // let effectiveStd = standardUnitWeight; 

        if (!isNaN(qty) && qty > 0 && standardUnitWeight && standardUnitWeight > 0) {
            // 1. Calculate Expected Net
            const expectedNet = qty * standardUnitWeight;

            // 2. Calculate Total Tara
            let unitTaraKg = 0;
            if (boxTara) {
                unitTaraKg = parseFloat(boxTara) / 1000; // g to kg
            }
            const expectedTotalTara = qty * unitTaraKg;

            // 3. Calculate Expected Gross
            const expectedGross = expectedNet + expectedTotalTara;

            // 4. Compare with current inputs (fuzzy comparison to avoid floating point issues)
            const currentNote = parseFloat(noteWeight);
            const currentGross = parseFloat(grossWeight);

            const isNoteDifferent = isNaN(currentNote) || Math.abs(currentNote - expectedNet) > 0.01;
            const isGrossDifferent = isNaN(currentGross) || Math.abs(currentGross - expectedGross) > 0.01;

            if (!isSuggestionsDismissed && (isNoteDifferent || isGrossDifferent)) {
                setSuggestedNote(expectedNet.toFixed(2));
                setSuggestedGross(expectedGross.toFixed(2));
            } else {
                setSuggestedNote(null);
                setSuggestedGross(null);
            }
        } else {
            setSuggestedNote(null);
            setSuggestedGross(null);
        }
    }, [boxQty, standardUnitWeight, boxTara, noteWeight, grossWeight]);

    const applyNoteSuggestion = () => {
        if (suggestedNote) {
            setNoteWeight(suggestedNote);
            setIsSuggestionsDismissed(true);
            setSuggestedNote(null);
            setSuggestedGross(null);
            showToast("Nota aplicada", "info");
        }
    };

    const applyGrossSuggestion = () => {
        if (suggestedGross) {
            setGrossWeight(suggestedGross);
            setIsSuggestionsDismissed(true);
            setSuggestedGross(null);
            setSuggestedNote(null);
            showToast("Bruto aplicado", "info");
        }
    };

    const applyWeightSuggestions = () => {
        if (suggestedNote) setNoteWeight(suggestedNote);
        if (suggestedGross) setGrossWeight(suggestedGross);
        setIsSuggestionsDismissed(true);
        setSuggestedNote(null);
        setSuggestedGross(null);
        setFloatingMessage({ text: "✓ Pesos aplicados", type: 'ai' });
        setTimeout(() => setFloatingMessage(null), 2000);
    };

    // Auto-fill Product (Legacy logic kept for Product only, removed weight autofill if any)
    useEffect(() => {
        if (isAiPopulating.current || !supplier) return;
        const pred = predictData(supplier, product);
        if (!product && pred.suggestedProduct) {
            setPrediction(prev => ({ ...prev, suggestedProduct: pred.suggestedProduct }));
        }
        // Tara auto-fill is still acceptable as per requirements (helps calculation)
        if (supplier && product && pred.suggestedTaraBox && (!boxTara || boxTara === '0')) {
            setBoxTara(Math.round(pred.suggestedTaraBox * 1000).toString());
            setShowBoxes(true);
        }
    }, [supplier, product]);

    const parseSum = (val: string) => {
        if (!val) return 0;

        // Robust parsing: 
        // 1. If there's a '+' we treat it as the separator.
        // 2. If there are commas, we need to check if they are decimal or separators.
        // Strategy: replace all commas with dots if strictly used as decimals, 
        // or split by '+' / space if used as separators.

        let normalized = val.replace(/\s+/g, ' '); // Normalize spaces

        // If it contains '+', use that as separator
        if (normalized.includes('+')) {
            return normalized.split('+').reduce((acc, curr) => {
                const v = parseFloat(curr.trim().replace(',', '.'));
                return acc + (isNaN(v) ? 0 : v);
            }, 0);
        }

        // If it contains multiple commas or commas followed by space, it's likely a sum
        // e.g. "10,5, 20,3" or "10, 20"
        if (normalized.includes(', ') || (normalized.match(/,/g) || []).length > 1) {
            return normalized.split(/[, ]+/).reduce((acc, curr) => {
                const v = parseFloat(curr.trim().replace(',', '.'));
                return acc + (isNaN(v) ? 0 : v);
            }, 0);
        }

        // Single value with possible comma decimal
        const singleVal = parseFloat(normalized.replace(',', '.'));
        return isNaN(singleVal) ? 0 : singleVal;
    };

    const parsedGrossWeight = useMemo(() => parseSum(grossWeight), [grossWeight]);
    const parsedBoxTara = useMemo(() => {
        const val = parseInt(boxTara, 10);
        return isNaN(val) ? 0 : val;
    }, [boxTara]);

    const parsedNoteWeight = useMemo(() => {
        if (!noteWeight) return 0;
        const v = parseFloat(noteWeight.toString().replace(',', '.'));
        return isNaN(v) ? 0 : v;
    }, [noteWeight]);

    const boxTaraKg = parsedBoxTara / 1000;
    const totalTara = (Number(boxQty) * boxTaraKg);
    // Prevent negative Net Weight if Gross Weight is not entered
    const netWeight = parsedGrossWeight > 0 ? parsedGrossWeight - totalTara : 0;
    const difference = netWeight - parsedNoteWeight;

    const handleReset = () => {
        setSupplier(''); setProduct(''); setBatch(''); setExpirationDate(''); setProductionDate('');
        setGrossWeight(''); setNoteWeight(''); setBoxQty(''); setBoxTara(''); setEvidence(null);
        setStorageType(null); setRecommendedTemp(''); setCriticalWarning(null);
        setSuggestedNote(null); setSuggestedGross(null);
        persistentFormState = null;
    };

    const handleSave = async () => {
        if (isSaving) return;
        const gWeight = parsedGrossWeight;
        const nWeight = parsedNoteWeight;
        if (!supplier || !product || gWeight <= 0 || nWeight <= 0) {
            showToast(t('msg_validation_error'), 'error');
            return;
        }

        setIsSaving(true);
        showToast("Salvando...", "info");

        const finalProduct = reformatProductName(product);

        try {
            // --- Cloud Image Persistence ---
            let finalEvidenceUrl = evidence || undefined;
            if (evidence && evidence.startsWith('data:image')) {
                const fileName = `evidence_${Date.now()}.jpg`;
                const uploadedUrl = await uploadImageToSupabase(evidence, fileName);
                if (uploadedUrl) {
                    finalEvidenceUrl = uploadedUrl;
                }
            }

            const syncResult = await saveRecord({
                id: Date.now().toString(), timestamp: Date.now(), supplier, product: finalProduct,
                batch: batch || undefined, expirationDate: expirationDate || undefined, productionDate: productionDate || undefined,
                grossWeight: gWeight, noteWeight: nWeight, netWeight, taraTotal: totalTara,
                boxes: { qty: Number(boxQty), unitTara: boxTaraKg }, status: Math.abs(difference) > TOLERANCE_KG ? 'error' : 'verified',
                evidence: finalEvidenceUrl, recommendedTemperature: recommendedTemp || undefined
            });
            handleReset();
            onRecordSaved?.();
            showToast(syncResult?.success ? t('msg_cloud_synced') : t('alert_saved'), 'success');
        } catch (error) {
            console.error("Save Error:", error);
            showToast("Erro ao salvar dados (memória cheia?)", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const hasDataToSave = !!(supplier && product && parsedGrossWeight > 0 && parsedNoteWeight > 0);
    useEffect(() => { onDataChange?.(hasDataToSave); }, [hasDataToSave, onDataChange]);

    useImperativeHandle(ref, () => ({
        save: handleSave,
        clear: () => setShowConfirmReset(true),
        openCamera: () => cameraInputRef.current?.click(),
        openGallery: () => galleryInputRef.current?.click(),
        hasUnsavedData: () => hasDataToSave
    }));

    const analyzeImageContent = async (base64Image: string) => {
        if (!navigator.onLine) {
            setFloatingMessage({ text: "Modo Offline: IA no disponible", type: 'warning' });
            setTimeout(() => setFloatingMessage(null), 3000);
            return;
        }
        setIsReadingImage(true);
        setFloatingMessage({ text: "🔍 Leyendo rótulo...", type: 'info' });
        isAiPopulating.current = true;
        setCriticalWarning(null);
        setStorageType(null);
        setRecommendedTemp('');
        setStandardUnitWeight(null); // Reset
        try {
            // Resize Image (Client Side Optimization)
            const resizedBase64 = await resizeImageToMax800(base64Image);
            const base64Data = resizedBase64.includes(',') ? resizedBase64.split(',')[1] : resizedBase64;

            const promptText = `EXTRACT_LOGISTICS_DATA_JSON:
            {
              "supplier": "string",
              "product": "string",
              "expiration": "DD/MM/YYYY" | null,
              "production": "DD/MM/YYYY" | null,
              "batch": "string" | null,
              "tara": "integer_grams" | null,
              "standard_unit_weight": "number_kg" | null,
              "storage": "frozen"|"refrigerated"|"dry",
              "temperature_range": "string" | null,
              "warning": "string" | null
            }
            Rules: Use high precision OCR. Output ONLY raw JSON. No markdown. If info is missing, use null.`;

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: promptText }
                ]
            };

            const text = await generateGeminiContent(prompt);
            if (!text) throw new Error("Empty response");

            // Robust JSON Parsing
            let cleanJson = text.replace(/```json|```/g, '').trim();
            // Try to find the first '{' and last '}' to handle extra text outside JSON
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            let data;
            try {
                data = JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                console.log("Raw Text:", text);
                throw new Error("Failed to parse AI response. " + text.substring(0, 50));
            }

            setFloatingMessage({ text: "✓ Rótulo leído correctamente", type: 'success' });
            setTimeout(() => setFloatingMessage(null), 2000);

            if (data.supplier && !supplier) setSupplier(data.supplier);
            if (data.product && !product) {
                setProduct(reformatProductName(data.product));
            }
            if (data.batch && !batch) setBatch(data.batch);
            if (data.expiration && !expirationDate) setExpirationDate(data.expiration);
            if (data.production && !productionDate) setProductionDate(data.production);
            if (data.storage) setStorageType(data.storage);

            if (data.temperature_range) {
                setRecommendedTemp(data.temperature_range);
                setTimeout(() => {
                    setFloatingMessage({ text: `🌡️ Temperatura: ${data.temperature_range}`, type: 'ai' });
                    setTimeout(() => setFloatingMessage(null), 4000);
                }, 2500);
            }

            if (data.warning) {
                setCriticalWarning(data.warning);
                setTimeout(() => {
                    setFloatingMessage({ text: `⚠️ ${data.warning}`, type: 'warning' });
                    setTimeout(() => setFloatingMessage(null), 5000);
                }, 3000);
            }

            if (data.tara) {
                let val = parseFloat(String(data.tara).replace(',', '.'));
                if (!isNaN(val)) {
                    if (val < 20) val = val * 1000; // Si es < 20 asumimos kg y pasamos a g
                    setBoxTara(Math.round(val).toString());
                    setShowBoxes(true);
                }
            }

            if (data.standard_unit_weight) {
                let std = parseFloat(String(data.standard_unit_weight).replace(',', '.'));
                if (!isNaN(std)) setStandardUnitWeight(std);
            }
        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            setFloatingMessage({ text: "Error al leer imagen", type: 'warning' });
            setTimeout(() => setFloatingMessage(null), 3000);
        } finally {
            setIsReadingImage(false);
            setTimeout(() => { isAiPopulating.current = false; }, 1500);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                const resized = await resizeImageToMax800(base64);
                setEvidence(resized);
                showToast("Imagem processada", "info");
                analyzeImageContent(resized);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in pt-4">

            {/* System Status Banner (Utilitarian) */}
            <div className={`
                p-2 rounded border-2 mx-1 mb-2
                ${floatingMessage
                    ? (floatingMessage.type === 'success' ? 'bg-emerald-100 border-emerald-500 text-emerald-900' :
                        floatingMessage.type === 'warning' ? 'bg-amber-100 border-amber-500 text-amber-900' :
                            floatingMessage.type === 'ai' ? 'bg-purple-100 border-purple-500 text-purple-900' :
                                'bg-blue-100 border-blue-500 text-blue-900')
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-500'}
            `}>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center shrink-0">
                        <span className={`material-icons-round text-xl ${floatingMessage ? (floatingMessage.type === 'ai' ? 'text-purple-500' : floatingMessage.type === 'success' ? 'text-emerald-500' : floatingMessage.type === 'warning' ? 'text-orange-500' : 'text-blue-500') : 'text-zinc-400'}`}>
                            {floatingMessage
                                ? (floatingMessage.type === 'success' ? 'check_circle' :
                                    floatingMessage.type === 'warning' ? 'warning' :
                                        floatingMessage.type === 'ai' ? 'auto_awesome' : 'info')
                                : (isReadingImage ? 'sync' : 'smart_toy')}
                        </span>
                    </div>
                    <div className="flex-1">
                        <p className={`text-xs font-bold leading-tight transition-colors duration-300
                            ${floatingMessage
                                ? (floatingMessage.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                                    floatingMessage.type === 'warning' ? 'text-orange-700 dark:text-orange-300' :
                                        floatingMessage.type === 'ai' ? 'text-purple-700 dark:text-purple-300' :
                                            'text-blue-700 dark:text-blue-300')
                                : 'text-zinc-600 dark:text-zinc-400'}`}
                        >
                            {floatingMessage ? floatingMessage.text : (isReadingImage ? "Analisando rótulo..." : carouselTip)}
                        </p>
                    </div>
                </div>
            </div>

            {/* 1. Main Metrics - Industrial LCD Display */}
            <div className="px-1 stagger-1">
                <div className="bg-[#0A0A0A] border-4 border-zinc-800 rounded-none p-4 relative overflow-hidden shadow-inner flex flex-col justify-between min-h-[140px]">
                    {/* LCD Glare Effect */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 pointer-events-none"></div>

                    {/* Top Row: Labels */}
                    <div className="flex justify-between items-start z-10">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">BRUTO</span>
                            <span className="text-3xl font-mono font-bold text-amber-500">{parsedGrossWeight.toFixed(3)} <span className="text-[10px] text-amber-700">KG</span></span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">OBJETIVO (NOTA)</span>
                            <span className="text-3xl font-mono font-bold text-blue-500">{parsedNoteWeight.toFixed(3)} <span className="text-[10px] text-blue-800">KG</span></span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">TARA TOTAL</span>
                            <span className="text-3xl font-mono font-bold text-amber-500">- {totalTara.toFixed(3)} <span className="text-[10px] text-amber-700">KG</span></span>
                        </div>
                    </div>

                    {/* Main Center: Net Weight */}
                    <div className="flex flex-col items-center justify-center z-10 my-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-1">PESO LÍQUIDO ACTUAL</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-mono font-bold tracking-tighter text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                                {netWeight.toFixed(3)}
                            </span>
                            <span className="text-sm font-mono font-bold text-emerald-700">KG</span>
                        </div>
                    </div>

                    {/* Bottom Row: Difference & Tolerance Status */}
                    <div className="flex items-center justify-between border-t border-dashed border-zinc-800/80 pt-3 mt-1 z-10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">DESVIACIÓN (TOL: ±{TOLERANCE_KG}KG)</span>
                        <div className={`flex items-center gap-1 font-mono font-bold text-xl px-2 py-0.5 border-2 ${Math.abs(difference) > TOLERANCE_KG ? 'border-red-500/30 text-red-500 bg-red-500/10 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]'}`}>
                            {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Input Identity */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded p-4 mx-1 stagger-3">
                <div className="space-y-4">
                    {/* Provedor */}
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">PROVEDOR</label>
                        <input
                            list="suppliers" value={supplier} onChange={e => setSupplier(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded p-2 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 uppercase"
                            placeholder="Ingrese Proveedor..."
                        />
                        <datalist id="suppliers">{suggestions.suppliers.map(s => <option key={s} value={s} />)}</datalist>
                    </div>
                    {/* Producto */}
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">PRODUTO</label>
                        <input
                            list="products"
                            value={product}
                            onChange={e => setProduct(e.target.value)}
                            onBlur={() => setProduct(reformatProductName(product))}
                            className="bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded p-2 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 uppercase"
                            placeholder="Ingrese Producto..."
                        />
                        <datalist id="products">{suggestions.products.map(p => <option key={p} value={p} />)}</datalist>
                    </div>
                </div>
            </div>

            {/* Logistics & Weights */}
            <div className={`grid grid-cols-2 gap-3 stagger-4 pt-2 transition-all duration-500`}>

                {/* AI Suggestion Banner (Purple) */}
                {(suggestedNote || suggestedGross) && (
                    <div className="col-span-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-2xl p-4 shadow-inner mb-2">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                    <span className="material-icons-round text-xs">auto_awesome</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Sugerencia Inteligente</span>
                            </div>
                            <button onClick={applyWeightSuggestions} className="text-[10px] font-black text-purple-400 hover:text-purple-600 transition-colors uppercase tracking-tighter">Aplicar Todos</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {suggestedNote && (
                                <button
                                    onClick={applyNoteSuggestion}
                                    className="bg-white/80 dark:bg-zinc-800/80 p-3 rounded-xl border border-purple-100 dark:border-purple-500/20 text-left flex items-center justify-between group active:scale-95 transition-all shadow-sm"
                                >
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase">Nota Sugerida</p>
                                        <p className="text-sm font-black text-purple-600">{suggestedNote} <span className="text-[10px] opacity-70">kg</span></p>
                                    </div>
                                    <span className="material-icons-round text-lg text-purple-300 group-hover:text-purple-600 transition-colors">add_circle</span>
                                </button>
                            )}
                            {suggestedGross && (
                                <button
                                    onClick={applyGrossSuggestion}
                                    className="bg-white/80 dark:bg-zinc-800/80 p-3 rounded-xl border border-purple-100 dark:border-purple-500/20 text-left flex items-center justify-between group active:scale-95 transition-all shadow-sm"
                                >
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase">Bruto Sugerido</p>
                                        <p className="text-sm font-black text-purple-600">{suggestedGross} <span className="text-[10px] opacity-70">kg</span></p>
                                    </div>
                                    <span className="material-icons-round text-lg text-purple-300 group-hover:text-purple-600 transition-colors">add_circle</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Note Input */}
                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded p-4 flex flex-col justify-center gap-2 h-20 transition-all focus-within:border-blue-500">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PESO NOTA (KG)</label>
                    <div className="flex items-baseline gap-1">
                        <input
                            ref={noteInputRef} type="text" inputMode="decimal" value={noteWeight} onChange={e => setNoteWeight(e.target.value)}
                            className="w-full bg-transparent font-mono font-bold text-zinc-800 dark:text-white outline-none text-2xl"
                            placeholder={suggestedNote || "0.00"}
                        />
                    </div>
                </div>

                {/* Gross Input */}
                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded p-4 flex flex-col justify-center gap-2 h-20 transition-all focus-within:border-indigo-500">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PESO BRUTO (KG)</label>
                    <div className="flex items-baseline gap-1">
                        <input
                            ref={grossInputRef} type="text" inputMode="decimal" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
                            className="w-full bg-transparent font-mono font-bold text-zinc-800 dark:text-white outline-none text-2xl"
                            placeholder={suggestedGross || "0.00"}
                        />
                    </div>
                </div>
            </div>

            {/* Tara Section Accordion */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded overflow-hidden stagger-5 mx-1">
                <div className="p-4 flex items-center justify-between cursor-pointer active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors" onClick={() => setShowBoxes(!showBoxes)}>
                    <div>
                        <h4 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest mb-1">TARA Y EMBALAJE</h4>
                        <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {boxQty || '0'} CAJAS × {boxTaraKg.toFixed(3)} KG = {totalTara.toFixed(3)} KG
                        </p>
                    </div>
                    <span className={`material-icons-round transition-transform duration-300 text-zinc-400 ${showBoxes ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                {showBoxes && (
                    <div className="p-4 pt-0 grid grid-cols-2 gap-3 animate-fade-in border-t-2 border-zinc-100 dark:border-zinc-800">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">UNIT PESO (g)</label>
                            <input type="tel" value={boxTara} onChange={e => setBoxTara(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 rounded p-2 text-sm font-mono font-bold outline-none border-2 border-zinc-200 dark:border-zinc-700 focus:border-blue-500" placeholder="0" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CANTIDAD</label>
                            <input
                                type="tel"
                                value={boxQty}
                                onChange={e => setBoxQty(e.target.value)}
                                onBlur={() => { if (boxQty) setShowBoxes(false); }}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 rounded p-2 text-sm font-mono font-bold outline-none border-2 border-zinc-200 dark:border-zinc-700 focus:border-blue-500"
                                placeholder="0"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 stagger-6 animate-fade-in px-1 pt-2">
                <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="col-span-2 h-16 rounded bg-blue-600 flex items-center justify-center gap-2 text-white active:bg-blue-700 transition-colors border-2 border-blue-800"
                >
                    <span className="material-icons-round">qr_code_scanner</span>
                    <span className="text-sm font-bold uppercase tracking-widest">SCAN</span>
                </button>

                <button
                    onClick={handleSave}
                    disabled={!hasDataToSave || isSaving}
                    className={`col-span-2 h-16 rounded flex items-center justify-center gap-2 transition-colors border-2 ${hasDataToSave && !isSaving ? 'bg-emerald-600 border-emerald-800 text-white active:bg-emerald-700' : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400 cursor-not-allowed'}`}
                >
                    <span className={`material-icons-round ${isSaving ? 'animate-spin' : ''}`}>{isSaving ? 'sync' : 'save'}</span>
                    <span className="text-sm font-bold uppercase tracking-widest">{isSaving ? 'PROCESANDO' : 'GUARDAR'}</span>
                </button>

                <button onClick={() => galleryInputRef.current?.click()} className="col-span-2 h-12 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center gap-2 text-zinc-700 dark:text-zinc-300 active:bg-zinc-300 transition-colors border-2 border-zinc-300 dark:border-zinc-700">
                    <span className="material-icons-round text-lg">image</span>
                    <span className="text-xs font-bold uppercase tracking-widest">GALERIA</span>
                </button>

                <button onClick={() => setShowConfirmReset(true)} className="col-span-2 h-12 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 active:bg-zinc-300 transition-colors border-2 border-zinc-300 dark:border-zinc-700">
                    <span className="material-icons-round text-lg">delete_sweep</span>
                    <span className="text-xs font-bold uppercase tracking-widest">LIMPIAR</span>
                </button>
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Reset Confirmation Portal */}
            {showConfirmReset && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirmReset(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 w-full max-w-xs rounded border-4 border-red-600 p-6 animate-fade-in-up">
                        <div className="flex items-center gap-3 border-b-2 border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
                            <span className="material-icons-round text-3xl text-red-600">warning</span>
                            <h3 className="font-bold text-zinc-900 dark:text-white text-lg uppercase">¿BORRAR DATOS?</h3>
                        </div>
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-6 uppercase">La información no guardada se perderá.</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setShowConfirmReset(false)} className="py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-2 border-zinc-300 dark:border-zinc-700 rounded font-bold uppercase tracking-widest active:bg-zinc-300">NO</button>
                            <button onClick={() => { handleReset(); setShowConfirmReset(false); }} className="py-3 bg-red-600 text-white border-2 border-red-800 rounded font-bold uppercase tracking-widest active:bg-red-700">SI, BORRAR</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
});
