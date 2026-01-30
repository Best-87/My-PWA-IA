import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { saveRecord, predictData, getKnowledgeBase, getLastRecordBySupplier } from '../services/storageService';
import { trackEvent } from '../services/analyticsService';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';
import { sendLocalNotification } from '../services/notificationService';
import { generateGeminiContent } from '../services/geminiService';

// UI Refactor - Match iOS Reference Image
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

let persistentFormState: any = null;

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

    const [suggestions, setSuggestions] = useState<{ products: string[], suppliers: string[] }>({ products: [], suppliers: [] });
    const [prediction, setPrediction] = useState<{ suggestedProduct?: string; suggestedTaraBox?: number; }>({});
    const [floatingMessage, setFloatingMessage] = useState<{ text: string, type: 'info' | 'success' | 'warning' | 'ai' } | null>(null);
    const [showConfirmReset, setShowConfirmReset] = useState(false);

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

    const boxTaraKg = parsedBoxTara / 1000;
    const totalTara = (Number(boxQty) * boxTaraKg);
    const netWeight = parsedGrossWeight - totalTara;
    const difference = netWeight - (Number(noteWeight) || 0);

    const handleReset = () => {
        setSupplier(''); setProduct(''); setBatch(''); setExpirationDate(''); setProductionDate('');
        setGrossWeight(''); setNoteWeight(''); setBoxQty(''); setBoxTara(''); setEvidence(null);
        setStorageType(null); setRecommendedTemp(''); setCriticalWarning(null);
        persistentFormState = null;
    };

    const handleSave = async () => {
        if (!supplier || !product || !grossWeight || !noteWeight) { showToast(t('msg_validation_error'), 'error'); return; }
        const syncResult = await saveRecord({
            id: Date.now().toString(), timestamp: Date.now(), supplier, product,
            batch: batch || undefined, expirationDate: expirationDate || undefined, productionDate: productionDate || undefined,
            grossWeight: parsedGrossWeight, noteWeight: Number(noteWeight), netWeight, taraTotal: totalTara,
            boxes: { qty: Number(boxQty), unitTara: boxTaraKg }, status: Math.abs(difference) > TOLERANCE_KG ? 'error' : 'verified',
            evidence: evidence || undefined, recommendedTemperature: recommendedTemp || undefined
        });
        handleReset();
        onRecordSaved?.();
        showToast(syncResult?.success ? t('msg_cloud_synced') : t('alert_saved'), 'success');
    };

    const hasDataToSave = !!(supplier && product && grossWeight && noteWeight);
    useEffect(() => { onDataChange?.(hasDataToSave); }, [hasDataToSave, onDataChange]);

    useImperativeHandle(ref, () => ({
        save: handleSave,
        clear: () => setShowConfirmReset(true),
        openCamera: () => cameraInputRef.current?.click(),
        openGallery: () => galleryInputRef.current?.click(),
        hasUnsavedData: () => hasDataToSave
    }));

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { setEvidence(event.target?.result as string); showToast("Imagen cargada", "info"); };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">

            {/* 1. Top Metrics Row (Matches Image) */}
            <div className="grid grid-cols-3 gap-3 stagger-1">
                {/* Net Weight */}
                <div className="bg-gradient-blue-card rounded-[2.2rem] p-4 flex flex-col items-center justify-between min-h-[110px] blue-card-shadow border border-white/20">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/70 self-start">PESO LÍQUIDO</span>
                    <div className="flex flex-col items-center flex-1 justify-center">
                        <div className="flex items-baseline text-white">
                            <span className="text-3xl font-black tracking-tighter tabular-nums">{Math.floor(netWeight)}</span>
                            <span className="text-sm font-bold opacity-60">.{netWeight.toFixed(3).split('.')[1]}</span>
                        </div>
                        <span className="text-[8px] font-black text-white/40 tracking-widest mt-0.5">KG</span>
                    </div>
                </div>

                {/* Difference */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.2rem] p-4 flex flex-col items-center justify-between min-h-[110px] shadow-sm border border-zinc-100 dark:border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 self-start">DIFERENCIA</span>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className={`text-lg font-black px-4 py-1 rounded-full ${Math.abs(difference) > TOLERANCE_KG ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                            {difference.toFixed(3)}
                        </div>
                    </div>
                </div>

                {/* Gross Weight Primary */}
                <div className="bg-gradient-purple-card rounded-[2.2rem] p-4 flex flex-col items-center justify-between min-h-[110px] purple-card-shadow border border-white/20">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/70 self-start">PESO BRUTO</span>
                    <div className="flex flex-col items-center flex-1 justify-center">
                        <div className="flex items-baseline text-white">
                            <span className="text-3xl font-black tracking-tighter tabular-nums">{Math.floor(parsedGrossWeight)}</span>
                            <span className="text-sm font-bold opacity-60">.{parsedGrossWeight.toFixed(3).split('.')[1]}</span>
                        </div>
                        <span className="text-[8px] font-black text-white/40 tracking-widest mt-0.5">KG</span>
                    </div>
                </div>
            </div>

            {/* 2. Warning Bar */}
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md px-6 py-4 rounded-full flex items-center gap-4 border border-white/40 dark:border-white/5 stagger-2 shadow-sm mx-1">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                    <span className="material-icons-round text-orange-500 text-xl">warning</span>
                </div>
                <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 leading-tight">
                    Separe as taras antes de pesar para mayor precisão.
                </p>
            </div>

            {/* 3. Input Identity Card */}
            <div className="smart-card p-6 stagger-3">
                <div className="space-y-6">
                    {/* Provedor */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-500 shadow-inner">
                            <span className="material-icons-round text-2xl">store</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">PROVEDOR</label>
                            <input
                                list="suppliers" value={supplier} onChange={e => setSupplier(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300 transition-colors"
                                placeholder="Fornecedor"
                            />
                            <datalist id="suppliers">{suggestions.suppliers.map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                    </div>
                    {/* Producto */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-orange-500 shadow-inner">
                            <span className="material-icons-round text-2xl">inventory_2</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">PRODUTO</label>
                            <input
                                list="products" value={product} onChange={e => setProduct(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300 transition-colors"
                                placeholder="Produto"
                            />
                            <datalist id="products">{suggestions.products.map(p => <option key={p} value={p} />)}</datalist>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Weighing Secondary Metrics Row */}
            <div className="grid grid-cols-2 gap-4 stagger-4">
                {/* Gross Input */}
                <div className="smart-card p-5 flex items-center gap-4 h-24">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0 text-purple-500 shadow-inner">
                        <span className="material-icons-round text-2xl">scale</span>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">PESO BRUTO</label>
                        <div className="flex items-baseline gap-1">
                            <input
                                ref={grossInputRef} type="text" inputMode="decimal" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
                                className="w-full bg-transparent font-black text-zinc-800 dark:text-white outline-none text-xl tabular-nums"
                                placeholder="0.00"
                            />
                            <span className="text-[10px] font-bold text-zinc-400">kg</span>
                        </div>
                    </div>
                </div>
                {/* Note Input */}
                <div className="smart-card p-5 flex items-center gap-4 h-24">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 shadow-inner">
                        <span className="material-icons-round text-2xl">description</span>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">PESO NOTA</label>
                        <div className="flex items-baseline gap-1">
                            <input
                                ref={noteInputRef} type="number" inputMode="decimal" value={noteWeight} onChange={e => setNoteWeight(e.target.value)}
                                className="w-full bg-transparent font-black text-zinc-800 dark:text-white outline-none text-xl tabular-nums"
                                placeholder="0.00"
                            />
                            <span className="text-[10px] font-bold text-zinc-400">kg</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Tara Section Accordion */}
            <div className="smart-card overflow-hidden stagger-5">
                <div className="p-6 flex items-center justify-between cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors" onClick={() => setShowBoxes(!showBoxes)}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-orange-500 shadow-inner">
                            <span className="material-icons-round text-2xl">grid_view</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-tight">Tara e embalagens</h4>
                            <p className="text-[10px] font-bold text-blue-500 tracking-tighter">
                                {boxQty || '0'} caixas × {boxTaraKg.toFixed(3)} kg = {totalTara.toFixed(3)} kg
                            </p>
                        </div>
                    </div>
                    <span className={`material-icons-round transition-transform duration-300 text-zinc-300 ${showBoxes ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                {showBoxes && (
                    <div className="p-6 pt-0 grid grid-cols-2 gap-4 animate-fade-in pl-20">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">UNIT PESO (g)</label>
                            <input type="tel" value={boxTara} onChange={e => setBoxTara(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 text-sm font-bold outline-none border border-zinc-100 dark:border-white/5 focus:border-blue-500 transition-colors" placeholder="0" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">CANTIDAD</label>
                            <input type="tel" value={boxQty} onChange={e => setBoxQty(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 text-sm font-bold outline-none border border-zinc-100 dark:border-white/5 focus:border-blue-500 transition-colors" placeholder="0" />
                        </div>
                    </div>
                )}
            </div>

            {/* 6. Action Buttons Bar (Bottom Integration) */}
            <div className="fixed bottom-24 left-4 right-4 z-[50] flex items-center justify-between gap-3 stagger-6 animate-fade-in-up">
                {/* SCAN Button - Pink Gradient */}
                <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-[1.5] h-16 rounded-[1.8rem] bg-gradient-pink-btn flex items-center justify-center gap-3 text-white btn-press active:scale-95 transition-all shadow-xl"
                >
                    <span className="material-icons-round text-2xl">photo_camera</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Scan</span>
                </button>

                {/* GALERIA */}
                <button onClick={() => galleryInputRef.current?.click()} className="action-btn-circle">
                    <span className="material-icons-round text-2xl text-purple-500">image</span>
                    <span className="text-[8px] font-black uppercase text-zinc-400 tracking-tighter">Galeria</span>
                </button>

                {/* LIMPAR */}
                <button onClick={() => setShowConfirmReset(true)} className="action-btn-circle">
                    <span className="material-icons-round text-2xl text-zinc-400 dark:text-zinc-500">delete_sweep</span>
                    <span className="text-[8px] font-black uppercase text-zinc-400 tracking-tighter">Limpar</span>
                </button>

                {/* SALVAR */}
                <button
                    onClick={handleSave}
                    disabled={!hasDataToSave}
                    className={`action-btn-circle ${hasDataToSave ? 'opacity-100 ring-2 ring-emerald-500/20' : 'opacity-40 grayscale'}`}
                >
                    <span className={`material-icons-round text-2xl ${hasDataToSave ? 'text-emerald-500' : 'text-zinc-400'}`}>save</span>
                    <span className="text-[8px] font-black uppercase text-zinc-400 tracking-tighter">Salvar</span>
                </button>
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Reset Confirmation Portal */}
            {showConfirmReset && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmReset(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 w-full max-w-xs rounded-[2rem] p-8 shadow-2xl animate-fade-in-up">
                        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 text-red-500">
                            <span className="material-icons-round text-3xl">delete_forever</span>
                        </div>
                        <h3 className="text-center font-black text-zinc-900 dark:text-white text-lg mb-2">¿Limpiar todo?</h3>
                        <p className="text-center text-xs font-bold text-zinc-500 mb-8 px-4 leading-relaxed">Se perderán todos los datos actuales del formulario.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowConfirmReset(false)} className="py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">No</button>
                            <button onClick={() => { handleReset(); setShowConfirmReset(false); }} className="py-4 bg-red-500 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/25">Si, Limpiar</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
});
