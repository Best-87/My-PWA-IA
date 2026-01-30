
import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { saveRecord, predictData, getKnowledgeBase, getLastRecordBySupplier } from '../services/storageService';
import { trackEvent } from '../services/analyticsService';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';
import { sendLocalNotification } from '../services/notificationService';
import { generateGeminiContent } from '../services/geminiService';

// UI Adjusted - v1.1

// Stable tolerance
const TOLERANCE_KG = 0.2;

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

// Persistent state outside component to survive tab switches
let persistentFormState: any = null;

export const WeighingForm = forwardRef<WeighingFormHandle, WeighingFormProps>(({ onViewHistory, onDataChange, onRecordSaved }, ref) => {
    const { t, language } = useTranslation();
    const { showToast } = useToast();

    // Form State initialized from persistent object if exists
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

    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [storageType, setStorageType] = useState<'frozen' | 'refrigerated' | 'dry' | null>(persistentFormState?.storageType || null);
    const [recommendedTemp, setRecommendedTemp] = useState<string>(persistentFormState?.recommendedTemp || '');
    const [criticalWarning, setCriticalWarning] = useState<string | null>(persistentFormState?.criticalWarning || null);

    const noteInputRef = useRef<HTMLInputElement>(null);
    const grossInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const isAiPopulating = useRef(false);

    const [suggestions, setSuggestions] = useState<{ products: string[], suppliers: string[] }>({ products: [], suppliers: [] });
    const [prediction, setPrediction] = useState<{ suggestedProduct?: string; suggestedTaraBox?: number; }>({});
    const [historyContext, setHistoryContext] = useState<string | null>(null);
    const [assistantMessage, setAssistantMessage] = useState("");

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReadingImage, setIsReadingImage] = useState(false);
    const [aiAlert, setAiAlert] = useState<string | null>(null);

    // Floating notification system
    const [floatingMessage, setFloatingMessage] = useState<{ text: string, type: 'info' | 'success' | 'warning' | 'ai' } | null>(null);

    // AI Tips Carousel Logic
    const [carouselTip, setCarouselTip] = useState<string>("");

    useEffect(() => {
        // Generate dynamic tips based on current form data
        const dynamicTips: string[] = [];

        if (expirationDate) {
            // Calculate days until expiration roughly
            const parts = expirationDate.split('/');
            if (parts.length === 3) {
                const exp = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                const now = new Date();
                const diffTime = exp.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) dynamicTips.push(`⚠️ ATENCIÓN: Venció hace ${Math.abs(diffDays)} días`);
                else if (diffDays <= 3) dynamicTips.push(`⚠️ ATENCIÓN: Vence en ${diffDays} días`);
                else dynamicTips.push(`📅 Vencimiento: ${expirationDate} (${diffDays} días restantes)`);
            } else {
                dynamicTips.push(`📅 Vencimiento: ${expirationDate}`);
            }
        }

        if (productionDate) dynamicTips.push(`🏭 Fabricado el: ${productionDate}`);
        if (batch) dynamicTips.push(`🏷️ Lote activo: ${batch}`);
        if (recommendedTemp) dynamicTips.push(`🌡️ Temperatura rec: ${recommendedTemp}`);

        if (storageType) {
            const types: Record<string, string> = { frozen: '❄️ Congelado (-18°C)', refrigerated: '💧 Refrigerado (0-7°C)', dry: '📦 Seco / Ambiente' };
            if (types[storageType]) dynamicTips.push(`Conservación: ${types[storageType]}`);
        }

        if (supplier) dynamicTips.push(`Proveedor: ${supplier}`);

        // Fallback to static tips
        const rawStaticTips = t('tips_carousel', { returnObjects: true });
        const staticTips = Array.isArray(rawStaticTips) ? rawStaticTips as string[] : [];

        // Combine dynamic tips first, then fill with static
        const tips = [...dynamicTips, ...staticTips];

        // Set initial
        if (!carouselTip && tips.length > 0) {
            setCarouselTip(tips[0]);
        } else if (tips.length === 0) {
            setCarouselTip(t('assistant_default'));
        }

        let index = 0;
        const interval = setInterval(() => {
            if (!floatingMessage && !isReadingImage && tips.length > 0) {
                index = (index + 1) % tips.length;
                setCarouselTip(tips[index]);
            }
        }, 5000); // 5s rotation for dynamic context

        return () => clearInterval(interval);
    }, [t, floatingMessage, isReadingImage, expirationDate, productionDate, batch, recommendedTemp, storageType, supplier]);

    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [activeSection, setActiveSection] = useState<'identity' | 'weights' | 'tara' | 'evidence' | null>(null);

    // Save state to persistent object on every change
    useEffect(() => {
        persistentFormState = {
            supplier, product, batch, expirationDate, productionDate,
            grossWeight, noteWeight, evidence, showBoxes, boxQty, boxTara,
            storageType, recommendedTemp, criticalWarning
        };
    }, [supplier, product, batch, expirationDate, productionDate, grossWeight, noteWeight, evidence, showBoxes, boxQty, boxTara, storageType, recommendedTemp, criticalWarning]);

    useEffect(() => {
        if (!assistantMessage) setAssistantMessage(t('assistant_default'));
    }, [t]);

    useEffect(() => {
        const kb = getKnowledgeBase();
        setSuggestions({ products: kb.products, suppliers: kb.suppliers });
    }, []);

    useEffect(() => {
        if (!showBoxes || !boxQty || boxQty === '0') return;
        const timer = setTimeout(() => {
            setShowBoxes(false);
            setActiveSection('weights');
            if (!noteWeight) noteInputRef.current?.focus();
            else grossInputRef.current?.focus();
        }, 5000);
        return () => clearTimeout(timer);
    }, [boxQty, showBoxes, noteWeight]);

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
        today.setHours(0, 0, 0, 0);
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
                    const MAX_WIDTH = 700; // Reducido para mayor velocidad de subida
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5); // Compresión aumentada
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
            setFloatingMessage({ text: "Modo Offline: IA no disponible", type: 'warning' });
            setTimeout(() => setFloatingMessage(null), 3000);
            return;
        }
        setIsReadingImage(true);
        setFloatingMessage({ text: "🔍 Leyendo rótulo...", type: 'info' });
        isAiPopulating.current = true;
        setAiAlert(null);
        setCriticalWarning(null);
        setStorageType(null);
        setRecommendedTemp('');
        try {
            const promptText = `EXTRACT_LOGISTICS_DATA_JSON:
            {
              "supplier": "string",
              "product": "string",
              "expiration": "DD/MM/YYYY" | null,
              "production": "DD/MM/YYYY" | null,
              "batch": "string" | null,
              "tara": "integer_grams" | null,
              "storage": "frozen"|"refrigerated"|"dry",
              "temperature_range": "string" | null,
              "warning": "string" | null
            }
            Rules: Use high precision OCR. Output ONLY raw JSON. No markdown. If info is missing, use null.`;
            const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

            const prompt = {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: promptText }
                ]
            };

            const text = await generateGeminiContent(prompt);
            if (!text) throw new Error("Empty response");

            const cleanJson = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            // Show success message
            setFloatingMessage({ text: "✓ Rótulo leído correctamente", type: 'success' });
            setTimeout(() => setFloatingMessage(null), 2000);

            if (data.supplier && !supplier) setSupplier(data.supplier);
            if (data.product && !product) setProduct(data.product);
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
                }, data.temperature_range ? 7000 : 2500);
            }

            if (data.tara) {
                let val = parseFloat(String(data.tara));
                if (!isNaN(val)) {
                    if (val < 20) val = val * 1000;
                    setBoxTara(Math.round(val).toString());
                    if (!boxQty || boxQty === '0') setBoxQty('0');
                    setShowBoxes(true);
                    setTimeout(() => {
                        setFloatingMessage({ text: `📦 Tara sugerida: ${Math.round(val)}g`, type: 'ai' });
                        setTimeout(() => setFloatingMessage(null), 4000);
                    }, data.warning ? 12500 : (data.temperature_range ? 7000 : 2500));
                }
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
        persistentFormState = null;
    };

    const handleSave = async () => {
        if (!supplier || !product || !grossWeight || !noteWeight) { showToast(t('msg_validation_error'), 'error'); return; }

        const syncResult = await saveRecord({
            id: Date.now().toString(), timestamp: Date.now(), supplier, product,
            batch: batch || undefined, expirationDate: expirationDate || undefined, productionDate: productionDate || undefined,
            grossWeight: parsedGrossWeight, noteWeight: Number(noteWeight), netWeight, taraTotal: totalTara,
            boxes: { qty: Number(boxQty), unitTara: boxTaraKg }, status: Math.abs(difference) > TOLERANCE_KG ? 'error' : 'verified',
            aiAnalysis: aiAlert || undefined, evidence: evidence || undefined, recommendedTemperature: recommendedTemp || undefined
        });

        handleReset();
        onRecordSaved?.(); // Notify parent to refresh records list
        trackEvent('weighing_saved', { netWeight });
        const kb = getKnowledgeBase();
        setSuggestions({ products: kb.products, suppliers: kb.suppliers });

        if (syncResult && syncResult.success) {
            showToast(t('msg_cloud_synced'), 'success');
        } else {
            showToast(t('alert_saved'), 'success');
        }

        sendLocalNotification('Registro Guardado', `${supplier} - ${product}: ${netWeight.toFixed(3)}kg`);
    };

    const inputClass = "w-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-zinc-900 dark:text-white font-semibold outline-none focus:bg-white dark:focus:bg-zinc-800 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 backdrop-blur-sm ios-input-focus";
    const suggestionClass = "ring-2 ring-blue-500/30 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]";
    const hasDataToSave = !!(supplier && product && grossWeight && noteWeight);

    useEffect(() => {
        onDataChange?.(hasDataToSave);
    }, [hasDataToSave, onDataChange]);

    useImperativeHandle(ref, () => ({
        save: handleSave,
        clear: () => setShowConfirmReset(true),
        openCamera: () => cameraInputRef.current?.click(),
        openGallery: () => galleryInputRef.current?.click(),
        hasUnsavedData: () => hasDataToSave
    }));

    const analyzeWithAI = async () => {
        if (!navigator.onLine) { setAiAlert("Modo Offline: IA no disponible."); return; }
        setIsAnalyzing(true);
        try {
            const prompt = `Act as a logistics supervisor. Context: User Language ${t('ai_prompt_lang')}. Info: Supplier: ${supplier}, Product: ${product}, Diff: ${difference.toFixed(2)}. Suggest action.`;
            const text = await generateGeminiContent(prompt);
            setAiAlert(text?.trim() || "Revisado.");
        } catch (e: any) {
            console.error(e);
            setAiAlert("Error IA.");
        } finally { setIsAnalyzing(false); }
    };

    const getSectionStyle = (section: string) => {
        const isActive = activeSection === section;
        const base = "transition-all duration-300 backdrop-blur-md border";

        if (isActive) {
            return `${base} bg-white/90 dark:bg-black/60 border-primary-500 ring-4 ring-primary-500/10 shadow-2xl scale-[1.01] z-10`;
        }

        const hasData = section === 'identity' ? (supplier || product) : section === 'weights' ? (grossWeight || noteWeight) : section === 'evidence' ? !!evidence : (showBoxes || prediction.suggestedTaraBox);

        if (hasData) {
            return `${base} bg-white/70 dark:bg-zinc-900/60 border-primary-500/30 dark:border-primary-500/20 shadow-lg`;
        }

        return `${base} bg-white/40 dark:bg-zinc-900/40 border-white/20 dark:border-white/5 hover:bg-white/60 dark:hover:bg-zinc-900/60 shadow-sm`;
    };

    return (
        <div className="space-y-6 pb-32">



            {/* 1. Floating Metrics Card - Overlaps Header (Reduced padding & size) */}
            <div className="smart-card relative z-30 p-4 flex flex-col gap-4 smart-shadow animate-fade-in-up">
                <div className="grid grid-cols-2 gap-4 divide-x divide-zinc-100 dark:divide-white/5">
                    <div className="flex flex-col items-start px-2">
                        <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">{t('lbl_net')}</span>
                        <div className="flex items-baseline text-zinc-800 dark:text-white">
                            <span className="text-5xl font-black tracking-tighter tabular-nums">{Math.floor(netWeight)}</span>
                            <span className="text-2xl font-bold opacity-60">.{netWeight.toFixed(3).split('.')[1]}</span>
                            <span className="text-sm font-bold opacity-40 ml-1">kg</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end px-2">
                        <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Diferencia</span>
                        <div className={`text-2xl font-black font-mono px-3 py-1.5 rounded-2xl transition-colors ${Math.abs(difference) > TOLERANCE_KG ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                            {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-50 dark:border-white/5">
                    <div className="flex flex-col items-start">
                        <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">{t('lbl_tara_section')}</span>
                        <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300 tabular-nums">{totalTara.toFixed(3)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">{t('lbl_gross_weight')}</span>
                        <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300 tabular-nums">{parsedGrossWeight.toFixed(3)}</span>
                    </div>
                </div>

                {/* AI Assistant Message Integrated - Moved here */}
                <div className={`
                    p-3 rounded-2xl transition-all duration-300 border mt-2
                    ${floatingMessage
                        ? (floatingMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' :
                            floatingMessage.type === 'warning' ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30' :
                                floatingMessage.type === 'ai' ? 'bg-purple-50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/30' :
                                    'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30')
                        : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-900/50 dark:border-white/5'}
                `}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors duration-300
                            ${floatingMessage ? 'bg-white dark:bg-zinc-800' : 'bg-gradient-header'}`}
                        >
                            <span className={`material-icons-round text-sm ${floatingMessage ? '' : 'text-white'}`}>
                                {floatingMessage
                                    ? (floatingMessage.type === 'success' ? 'check_circle' :
                                        floatingMessage.type === 'warning' ? 'warning' :
                                            floatingMessage.type === 'ai' ? 'auto_awesome' : 'info')
                                    : 'smart_toy'}
                            </span>
                        </div>
                        <div className="flex-1">
                            <p className={`text-[11px] font-bold leading-tight transition-colors duration-300
                                ${floatingMessage
                                    ? (floatingMessage.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                                        floatingMessage.type === 'warning' ? 'text-orange-700 dark:text-orange-300' :
                                            floatingMessage.type === 'ai' ? 'text-purple-700 dark:text-purple-300' :
                                                'text-blue-700 dark:text-blue-300')
                                    : 'text-zinc-500 dark:text-zinc-400'}`}
                            >
                                {floatingMessage ? floatingMessage.text : carouselTip}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Action Buttons (Routines) */}
            <div className="flex items-center justify-between gap-3 px-2 stagger-1 animate-fade-in-up">
                <h3 className="text-zinc-900 dark:text-white font-bold text-lg hidden">Acciones</h3>

                <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 aspect-square rounded-full bg-gradient-primary shadow-lg shadow-pink-500/20 flex flex-col items-center justify-center gap-1 text-white btn-press"
                >
                    <span className="material-icons-round text-3xl">photo_camera</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Scan</span>
                </button>

                <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex-1 aspect-square rounded-full bg-white dark:bg-zinc-800 shadow-md flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-zinc-300 btn-press border border-zinc-100 dark:border-white/5"
                >
                    <span className="material-icons-round text-3xl text-purple-400">collections</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Galeria</span>
                </button>

                <button
                    onClick={() => setShowConfirmReset(true)}
                    className="flex-1 aspect-square rounded-full bg-white dark:bg-zinc-800 shadow-md flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-zinc-300 btn-press border border-zinc-100 dark:border-white/5"
                >
                    <span className="material-icons-round text-3xl text-zinc-400">delete_sweep</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('btn_clear')}</span>
                </button>

                <button
                    onClick={handleSave}
                    className={`flex-1 aspect-square rounded-full shadow-lg flex flex-col items-center justify-center gap-1 text-white btn-press transition-all ${hasDataToSave ? 'bg-gradient-header shadow-blue-500/30' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 shadow-none'}`}
                >
                    <span className="material-icons-round text-3xl">save</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Save</span>
                </button>
            </div>

            {/* 3. Input Lists (Rooms style) */}
            <div className="space-y-4 px-1 stagger-2 animate-fade-in-up">

                {/* Identity Card */}
                <div className={`smart-card p-4 flex items-center gap-4 transition-all ${activeSection === 'identity' ? 'ring-2 ring-blue-500/20' : ''}`} onClick={() => setActiveSection('identity')}>
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-500">
                        <span className="material-icons-round text-2xl">store</span>
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-1 gap-2">
                        <div className="relative">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">Proveedor</label>
                            <input
                                list="suppliers" value={supplier} onChange={e => setSupplier(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300"
                                placeholder={t('ph_supplier')}
                            />
                            <datalist id="suppliers">{suggestions.suppliers.map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                        <div className="relative">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">Producto</label>
                            <input
                                list="products" value={product} onChange={e => setProduct(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300"
                                placeholder={t('ph_product')}
                            />
                            <datalist id="products">{suggestions.products.map(p => <option key={p} value={p} />)}</datalist>
                        </div>
                    </div>
                </div>

                {/* Logistics Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="smart-card p-4 flex flex-col justify-between h-24">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center"><span className="material-icons-round text-sm">factory</span></div>
                            <span className="text-[10px] font-bold uppercase">{t('ph_production')}</span>
                        </div>
                        <input type="text" value={productionDate} onChange={e => setProductionDate(e.target.value)} placeholder="DD/MM/YYYY" className="bg-transparent font-bold text-zinc-700 dark:text-zinc-200 outline-none w-full text-sm" />
                    </div>
                    <div className="smart-card p-4 flex flex-col justify-between h-24">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center"><span className="material-icons-round text-sm">event_busy</span></div>
                            <span className="text-[10px] font-bold uppercase">{t('ph_expiration')}</span>
                        </div>
                        <input type="text" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} placeholder="DD/MM/YYYY" className="bg-transparent font-bold text-zinc-700 dark:text-zinc-200 outline-none w-full text-sm" />
                    </div>
                </div>

                {/* Weighing Inputs */}
                <div className={`smart-card p-4 flex items-center gap-4 transition-all ${activeSection === 'weights' ? 'ring-2 ring-blue-500/20' : ''}`} onClick={() => setActiveSection('weights')}>
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0 text-purple-500">
                        <span className="material-icons-round text-2xl">scale</span>
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">{t('lbl_gross_weight')}</label>
                            <div className="flex items-baseline gap-1 border-b border-zinc-100 dark:border-white/10 focus-within:border-purple-500 transition-colors">
                                <input
                                    ref={grossInputRef} type="text" inputMode="decimal" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
                                    className="w-full bg-transparent py-1 text-lg font-bold text-zinc-900 dark:text-white outline-none tabular-nums"
                                    placeholder="0.00"
                                />
                                <span className="text-xs text-zinc-400 font-medium">kg</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">{t('lbl_note_weight')}</label>
                            <div className="flex items-baseline gap-1 border-b border-zinc-100 dark:border-white/10 focus-within:border-purple-500 transition-colors">
                                <input
                                    ref={noteInputRef} type="number" inputMode="decimal" step="0.01" value={noteWeight} onChange={e => setNoteWeight(e.target.value)}
                                    className="w-full bg-transparent py-1 text-lg font-bold text-zinc-900 dark:text-white outline-none tabular-nums"
                                    placeholder="0.00"
                                />
                                <span className="text-xs text-zinc-400 font-medium">kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`smart-card p-4 transition-all ${activeSection === 'tara' ? 'ring-2 ring-blue-500/20' : ''}`} onClick={() => setActiveSection('tara')}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowBoxes(!showBoxes)}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-orange-500">
                                <span className="material-icons-round text-2xl">inventory_2</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{t('lbl_tara_section')}</h4>
                                {!showBoxes ? (
                                    <p className="text-[10px] font-bold text-purple-400 animate-fade-in">
                                        {boxQty || '0'} cajas × {boxTaraKg.toFixed(3)} kg = {totalTara.toFixed(3)} kg
                                    </p>
                                ) : (
                                    <p className="text-xs text-zinc-500">Cajas y empaques</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`material-icons-round transition-transform duration-300 ${showBoxes ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </div>
                    </div>

                    {showBoxes && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in pl-16 mt-4">
                            <div className="relative group">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">{t('lbl_unit_weight')} (g)</label>
                                <input type="tel" value={boxTara} onChange={e => setBoxTara(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm font-bold outline-none" placeholder="0" />
                            </div>
                            <div className="relative group">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">{t('lbl_qty')}</label>
                                <input type="tel" value={boxQty} onChange={e => setBoxQty(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm font-bold outline-none" placeholder="0" />
                            </div>
                            {prediction.suggestedTaraBox && (
                                <button onClick={() => { setBoxTara(Math.round(prediction.suggestedTaraBox! * 1000).toString()); setBoxQty('0'); }} className="col-span-2 text-xs text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/20 py-2 rounded-xl flex items-center justify-center gap-2">
                                    <span className="material-icons-round text-sm">auto_fix_high</span>
                                    Usar sugerencia IA: {Math.round(prediction.suggestedTaraBox! * 1000)}g
                                </button>
                            )}
                        </div>
                    )}
                </div>


            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />


            {showConfirmReset && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" style={{ touchAction: 'none' }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-slide-up ring-1 ring-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[60px] pointer-events-none"></div>
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="relative mb-5">
                                <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full"></div>
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center relative shadow-sm border border-red-100 dark:border-red-900/30">
                                    <span className="material-icons-round text-3xl text-red-500">delete_forever</span>
                                </div>
                            </div>
                            <h3 id="modal-title" className="text-xl font-black text-zinc-900 dark:text-white mb-2 leading-tight">{t('msg_confirm_clear')}</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed px-4">Esta acción no se puede deshacer. Se borrarán todos los datos del formulario actual.</p>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={() => setShowConfirmReset(false)} className="py-3.5 rounded-xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">{t('btn_not_now')}</button>
                                <button onClick={() => { handleReset(); setShowConfirmReset(false); }} className="py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">{t('btn_erase')}</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
});
