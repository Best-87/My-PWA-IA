
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Scale, Package, ShoppingCart, Calendar, Tag, Thermometer,
    Camera, Image as ImageIcon, Trash2, Save, History, ChevronDown,
    AlertTriangle, Check, FileText, Info, BarChart3, Scan as ScanIcon, ChevronRight, QrCode
} from 'lucide-react';
import { WeighingFormProps } from '../WeighingForm';
import { NFScanner } from './NFScanner';
import { UnifiedNFProcessor } from './UnifiedNFProcessor';
import { useToast } from '../Toast';
import { saveRecord, predictData } from '../../services/storageService';
import { trackEvent } from '../../services/analyticsService';

export const WeighingFormV2: React.FC<WeighingFormProps> = ({ onViewHistory, onDataChange, onRecordSaved }) => {
    const { showToast } = useToast();
    const [isPackExpanded, setIsPackExpanded] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerMode, setScannerMode] = useState<'nf' | 'label'>('nf');
    const [showUnifiedNF, setShowUnifiedNF] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [productPickerList, setProductPickerList] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('pending_products_v2');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('pending_nf_data_v2');
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });

    // Auto-save pending products to cache
    useEffect(() => {
        try {
            if (productPickerList.length > 0) {
                localStorage.setItem('pending_products_v2', JSON.stringify(productPickerList));
            } else {
                localStorage.removeItem('pending_products_v2');
            }
        } catch (e) { console.warn('Persistence error', e); }
    }, [productPickerList]);

    useEffect(() => {
        try {
            if (pendingFormData) {
                localStorage.setItem('pending_nf_data_v2', JSON.stringify(pendingFormData));
            } else {
                localStorage.removeItem('pending_nf_data_v2');
            }
        } catch (e) { console.warn('Persistence error', e); }
    }, [pendingFormData]);

    const emptyForm = {
        supplier: '',
        product: '',
        gross: '',
        note: '',
        qty: '',
        tara: '',
        batch: '',
        exp: '',
        storage: 'dry',
        cnpj: '',
        noteNumber: '',
        accessKey: '',
        evidence: null as string | null
    };

    // Initialize state from local cache to prevent data loss on refresh/tab switch
    const [form, setForm] = useState(() => {
        try {
            const saved = localStorage.getItem('weighing_form_cache_v2');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Error reading form cache', e);
        }
        return emptyForm;
    });

    // Auto-save form to cache whenever it changes (Safe version)
    React.useEffect(() => {
        try {
            // SLIM CACHE: Don't store the huge base64 evidence in persistent form cache
            // to avoid localStorage QuotaExceededError. 
            const slimForm = { ...form, evidence: null }; 
            localStorage.setItem('weighing_form_cache_v2', JSON.stringify(slimForm));
        } catch (e) {
            console.warn('Form cache full, clearing old entries', e);
            localStorage.removeItem('weighing_form_cache_v2');
        }
    }, [form]);

    const parsedGross = parseFloat(form.gross.replace(',', '.')) || 0;
    const parsedNote = parseFloat(form.note.replace(',', '.')) || 0;
    const parsedQty = parseFloat(form.qty) || 0;
    const parsedTara = (parseFloat(form.tara) / 1000) || 0; // g to kg
    const totalTara = parsedQty * parsedTara;
    const netWeight = parsedGross > 0 ? parsedGross - totalTara : 0;
    const diff = netWeight - parsedNote;
    const isOk = Math.abs(diff) <= 0.2;

    // --- Intelligent Field Runner (Suggestions & Inferences) ---
    React.useEffect(() => {
        if (!form.supplier) return;

        // 1. Storage Knowledge Suggestions
        const suggestions = predictData(form.supplier, form.product);

        // a. Suggest Product and CNPJ
        if (!form.product && suggestions.suggestedProduct) {
            updateForm('product', suggestions.suggestedProduct);
        }
        if (!form.cnpj && suggestions.suggestedCnpj) {
            updateForm('cnpj', suggestions.suggestedCnpj);
        }

        // b. Suggest Unit Tara (only if missing)
        if (form.product && !form.tara && suggestions.suggestedUnitTara) {
            updateForm('tara', suggestions.suggestedUnitTara.toString());
        }

        // 2. Smart Quantity Inference (Calculation based on weights & current tara)
        // This runs if we have weights and tara, but Qty is either missing or wrong (matches net kg)
        if (parsedGross > 0 && parsedNote > 0 && parsedTara > 0) {
            const qtyMatchesNet = Math.abs(parsedQty - parsedNote) < 0.1;
            const isQtyDefault = !form.qty || form.qty === '0' || form.qty === '1';

            if (isQtyDefault || qtyMatchesNet) {
                const diffWeight = parsedGross - parsedNote;
                // Only infer if the delta is significant (at least half a box weight)
                if (diffWeight > parsedTara * 0.45) {
                    const inferredQty = Math.round(diffWeight / parsedTara);
                    if (inferredQty > 1 && inferredQty < 1000 && inferredQty !== parsedQty) {
                        updateForm('qty', inferredQty.toString());
                        showToast(`Qtd. de caixas ajustada (${inferredQty}) automaticamente`, 'info');
                    }
                }
            }
        }
    }, [form.supplier, form.product, parsedGross, parsedNote, parsedTara, parsedQty]);

    const updateForm = (field: string, val: any) => {
        setForm((prev: typeof emptyForm) => ({ ...prev, [field]: val }));
        if (onDataChange) onDataChange(true);
    };

    const handleSave = async () => {
        if (!form.supplier || !form.product || !form.gross) {
            showToast("Preencha Fornecedor, Produto e Peso Bruto", "error");
            return;
        }

        if (isSaving) return;
        setIsSaving(true);

        try {
            const qty = parseFloat(form.qty) || 0;
            const taraUnitKg = (parseFloat(form.tara) / 1000) || 0;
            const totalTara = qty * taraUnitKg;
            const gross = parseFloat(form.gross.replace(',', '.')) || 0;
            const noteWeight = parseFloat(form.note.replace(',', '.')) || 0;
            const netWeight = gross - totalTara;

            const record = {
                id: crypto.randomUUID(),
                timestamp: Date.now(), // Use Number (Unix timestamp)
                supplier: form.supplier,
                product: form.product,
                grossWeight: gross,
                noteWeight: noteWeight,
                netWeight: netWeight,
                taraTotal: totalTara,
                boxes: { qty: qty, unitTara: parseFloat(form.tara) || 0 }, // Nested object as per type
                status: Math.abs(netWeight - noteWeight) <= 0.2 ? 'verified' : 'error',
                batch: form.batch,
                expirationDate: form.exp,
                storage: form.storage,
                cnpj: form.cnpj,
                noteNumber: form.noteNumber,
                evidence: form.evidence // Save the photo
            };

            // CAPA 4: FEEDBACK LOOP TRIGGER (Aprender taras del CNPJ, proveedor y producto)
            if ((form.cnpj || form.supplier) && form.tara && parseFloat(form.tara) > 0) {
                import('../../services/HybridExtractionService').then(m => 
                    m.feedbackLoopLearnTara(
                        form.cnpj || null, 
                        form.supplier || null, 
                        parseFloat(form.tara) / 1000, 
                        form.product || null
                    )
                );
            }

            const result: any = await saveRecord(record as any);
            if (result?.error) throw new Error(result.error);

            // --- PERSISTENCE & FLOW LOGIC: Multi-product handling ---
            const currentProductName = form.product;
            const updatedList = productPickerList.filter(p => {
                const desc = typeof p === 'string' ? p : p.descricao;
                return desc !== currentProductName;
            });

            setProductPickerList(updatedList);

            if (updatedList.length > 0) {
                // PRESERVE HEADER: Keep invoice context for the next items
                setForm(prev => ({
                    ...emptyForm,
                    supplier: prev.supplier,
                    cnpj: prev.cnpj,
                    noteNumber: prev.noteNumber,
                    accessKey: prev.accessKey,
                    evidence: prev.evidence,
                    tara: prev.tara, // Preserve tara as it's likely the same for other items in same NF
                    storage: prev.storage
                }));
                
                showToast(`Salvo! ${updatedList.length} ${updatedList.length === 1 ? 'item restante' : 'itens restantes'} na nota.`, "success");
                
                // AUTO-FLOW: Re-open picker for the next item after a small delay
                setTimeout(() => {
                    setShowProductPicker(true);
                }, 1000);

            } else {
                // ALL DONE: Complete reset
                setPendingFormData(null);
                setForm(emptyForm);
                localStorage.removeItem('weighing_form_cache_v2');
                showToast("Conferência salva com sucesso!", "success");
            }

            if (onRecordSaved) onRecordSaved();
        } catch (error) {
            console.error("Save Error:", error);
            showToast("Erro ao salvar", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-collapse logic for Tara
    React.useEffect(() => {
        if (form.qty && parseInt(form.qty) > 0 && isPackExpanded) {
            const timer = setTimeout(() => setIsPackExpanded(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [form.qty]);

    return (
        <div className="space-y-4 animate-fade-in-up">
            {/* 1. Summary Card - LCD Modernized */}
            <div className={`relative overflow-hidden p-4 rounded-[2rem] border transition-all duration-500 shadow-sm ${isOk ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40' :
                'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/40'
                }`}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className={`text-[11px] font-bold uppercase tracking-tight ${isOk ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isOk ? 'OK' : 'Divergência'}
                            </span>
                        </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <Scale className={`w-5 h-5 ${isOk ? 'text-emerald-500' : 'text-red-500'}`} />
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1">Diferença</span>
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-5xl font-black tracking-tighter ${isOk ? 'text-zinc-900 dark:text-white' : 'text-red-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                        </span>
                        <span className="text-sm font-bold text-zinc-400">KG</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="text-center">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Nota</span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{parsedNote.toFixed(3)}</span>
                    </div>
                    <div className="text-center border-x border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Líquido</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-white">{netWeight.toFixed(3)}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Bruto</span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{parsedGross.toFixed(3)}</span>
                    </div>
                </div>
            </div>

            {/* 1.5 Pending Products from Scan (SMART SESSION) */}
            {productPickerList.length > 0 && (
                <div className="bg-blue-600 dark:bg-blue-600 p-5 rounded-[2rem] flex items-center justify-between animate-fade-in shadow-xl shadow-blue-500/20 border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[9px] font-black uppercase text-blue-100 tracking-wider">Sessão Ativa</p>
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            </div>
                            <p className="text-sm font-bold text-white truncate">
                                {productPickerList.length} {productPickerList.length === 1 ? 'item pendente' : 'itens pendentes'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => {
                                if(confirm("Deseja descartar os itens pendentes desta nota?")) {
                                    setProductPickerList([]);
                                    setPendingFormData(null);
                                }
                            }}
                            className="p-3 text-blue-200 hover:text-white transition-colors active:scale-95"
                            title="Limpar pendências"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setShowProductPicker(true)}
                            className="px-6 py-3 bg-white text-blue-600 text-[11px] font-black uppercase rounded-xl active:scale-95 transition-all shadow-lg"
                        >
                            Selecionar
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Scanners Triggers */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setShowUnifiedNF(true)}
                    className="group bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-[2rem] text-white shadow-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/10"
                >
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black block uppercase tracking-tighter">Scanner<br/>Nota Fiscal</span>
                    </div>
                </button>

                <button
                    onClick={() => { setScannerMode('label'); setShowScanner(true); }}
                    className="group bg-gradient-to-br from-purple-600 to-fuchsia-700 p-4 rounded-[2rem] text-white shadow-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/10"
                >
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <Tag className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black block uppercase tracking-tighter">Scanner<br/>Etiqueta</span>
                    </div>
                </button>
            </div>

            {/* 3. Main Form Sections */}
            <div className="space-y-4">
                {/* Logistics Information */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Dados Logísticos
                    </h3>

                    <div className="space-y-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                <Tag className="w-3.5 h-3.5" />
                            </span>
                            <input
                                type="text"
                                placeholder="PROVEDOR / FORNECEDOR"
                                value={form.supplier}
                                onChange={e => updateForm('supplier', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium uppercase placeholder:text-zinc-400 transition-all"
                            />
                        </div>

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                <Package className="w-3.5 h-3.5" />
                            </span>
                            <input
                                type="text"
                                placeholder="NOME DO PRODUTO"
                                value={form.product}
                                onChange={e => updateForm('product', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium uppercase placeholder:text-zinc-400 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="CNPJ"
                                    value={form.cnpj}
                                    onChange={e => updateForm('cnpj', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-[10px] font-medium placeholder:text-zinc-400 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="№ NOTA"
                                    value={form.noteNumber}
                                    onChange={e => updateForm('noteNumber', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-[10px] font-medium placeholder:text-zinc-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="LOTE"
                                value={form.batch}
                                onChange={e => updateForm('batch', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-purple-500/50 text-[10px] font-medium placeholder:text-zinc-400 transition-all"
                            />
                            <input
                                type="text"
                                placeholder="VALIDADE"
                                value={form.exp}
                                onChange={e => updateForm('exp', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-purple-500/50 text-[10px] font-medium placeholder:text-zinc-400 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Packing Section - Collapsible */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
                    <button
                        onClick={() => setIsPackExpanded(!isPackExpanded)}
                        className="w-full p-6 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <BoxIcon className="w-4 h-4" /> Embalagem & Tara
                            </h3>
                            {!isPackExpanded && (form.qty || form.tara) && (
                                <div className="flex items-center gap-2 animate-fade-in">
                                    {form.qty && (
                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase">
                                            {form.qty} uds
                                        </span>
                                    )}
                                    {form.tara && (
                                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase">
                                            {form.tara}g
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className={`p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 group-hover:bg-zinc-100 transition-colors ${isPackExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                        </div>
                    </button>

                    <div className={`px-5 pb-5 space-y-3 ${isPackExpanded ? 'block animate-slide-up' : 'hidden'}`}>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Qtd</label>
                                <input
                                    type="number"
                                    value={form.qty}
                                    onChange={e => updateForm('qty', e.target.value)}
                                    placeholder=""
                                    className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-sm font-black text-center"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tara (g)</label>
                                <input
                                    type="number"
                                    value={form.tara}
                                    onChange={e => updateForm('tara', e.target.value)}
                                    placeholder=""
                                    className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-sm font-black text-center"
                                />
                            </div>
                        </div>
                        <p className="text-[9px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg text-center font-medium">
                            Tara total: <span className="text-zinc-900 dark:text-white font-bold">{totalTara.toFixed(3)} KG</span>
                        </p>
                    </div>
                </div>

                {/* Weight Inputs */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Scale className="w-4 h-4" /> Conferência de Pesos
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-1">Peso Nota</label>
                            <input
                                type="text"
                                value={form.note}
                                onChange={e => updateForm('note', e.target.value)}
                                placeholder="0.000"
                                className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-xl font-black text-center text-zinc-900 dark:text-white transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-1">Peso Bruto</label>
                            <input
                                type="text"
                                value={form.gross}
                                onChange={e => updateForm('gross', e.target.value)}
                                placeholder="0.000"
                                className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-xl font-black text-center text-zinc-900 dark:text-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pb-4">
                <button
                    onClick={() => {
                        setForm(emptyForm);
                        localStorage.removeItem('weighing_form_cache_v2');
                    }}
                    className="py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-zinc-200 dark:border-zinc-700"
                >
                    <Trash2 className="w-4 h-4" /> Limpar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${
                        isSaving
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white shadow-blue-500/25'
                    }`}
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>

            {showScanner && (
                <NFScanner
                    mode={scannerMode}
                    onDataExtracted={(data) => {
                        if (scannerMode === 'nf') {
                            // Fill all NF fields immediately
                            if (data.cnpj) updateForm('cnpj', data.cnpj);
                            if (data.invoiceNumber) updateForm('noteNumber', data.invoiceNumber);
                            if (data.supplier) updateForm('supplier', data.supplier);
                            if (data.evidence) updateForm('evidence', data.evidence);

                            // Product picker if multiple products
                            const prods: string[] = (data.products || []).filter(Boolean);
                            if (prods.length > 1) {
                                setPendingFormData(data);
                                setProductPickerList(prods);
                                setShowProductPicker(true);
                            } else {
                                // Clear old lists if new scan has only one product
                                setPendingFormData(null);
                                setProductPickerList([]);
                                
                                if (data.qty) updateForm('qty', data.qty.toString());
                                // Fallback: If product weight is not in table, use header total weight
                                const finalNoteWeight = data.noteWeight || data.totalWeight || null;
                                if (finalNoteWeight) {
                                    updateForm('note', finalNoteWeight.toString());
                                    updateForm('gross', finalNoteWeight.toString()); // Sincronizar bruto para productos sin tara
                                }
                                showToast('Nota Fiscal processada!', 'success');
                            }
                        } else {
                            // Label Logic: fill product/tara if missing, supplier only if empty
                            if (data.product && !form.product) updateForm('product', data.product);
                            if (data.batch) updateForm('batch', data.batch);
                            if (data.expirationDate) updateForm('exp', data.expirationDate);
                            if (data.unitTara && !form.tara || form.tara === '0') updateForm('tara', data.unitTara.toString());

                            // Mismatch Auditor (Cross-Validation)
                            if (data.cnpj && form.cnpj && data.cnpj !== form.cnpj) {
                                showToast(`⚠️ ALERTA: A etiqueta pertence a um CNPJ (${data.cnpj}) diferente da Nota Mestre!`, "error");
                            }

                            // Notification for Auto-Tara derived from ML
                            if (data.unitTara && !data.grossWeight && !data.batch) {
                                showToast("Tara importada automaticamente pelo histórico de IA", "info");
                            }

                            // Supplier from label only if not already filled by NF
                            if (data.supplier && !form.supplier) {
                                updateForm('supplier', data.supplier);
                            }

                            if (data.evidence) updateForm('evidence', data.evidence);
                            showToast("Rótulo processado!", "success");
                        }
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {showUnifiedNF && (
                <UnifiedNFProcessor
                    onClose={() => setShowUnifiedNF(false)}
                    currentPesagem={parsedGross}
                    onDataCombined={(data) => {
                        // Atomic state update to prevent race conditions
                        setForm((prev: any) => ({
                            ...prev,
                            cnpj: data.cnpj || prev.cnpj,
                            noteNumber: data.noteNumber || prev.noteNumber,
                            supplier: data.supplier || prev.supplier,
                            accessKey: data.accessKey || prev.accessKey,
                            evidence: data.evidence || prev.evidence,
                            product: data.product || prev.product,
                            qty: (data.qty !== null && data.qty !== undefined) ? String(data.qty) : prev.qty,
                            note: data.noteWeight ? String(data.noteWeight) : (data.totalWeight ? String(data.totalWeight) : prev.note),
                            gross: data.grossWeight ? String(data.grossWeight) : (data.noteWeight ? String(data.noteWeight) : prev.gross)
                        }));

                        if (onDataChange) onDataChange(true);

                        // If multiple products, show picker (this uses the same data)
                        const prods: any[] = (data.products || []).filter(Boolean);
                        if (prods.length > 1) {
                            setPendingFormData(data);
                            setProductPickerList(prods);
                            setShowProductPicker(true);
                        } else {
                            // Clear old lists if new scan has only one product
                            setPendingFormData(null);
                            setProductPickerList([]);

                            // Calc unit tara if we have both weights and qty > 0
                            const finalNoteWeight = data.noteWeight || data.totalWeight || 0;
                            const finalGrossWeight = data.grossWeight || 0;
                            const finalQty = parseFloat(data.qty) || 0;

                            if (finalGrossWeight > 0 && finalNoteWeight > 0 && finalQty > 0) {
                                const diffWeight = finalGrossWeight - finalNoteWeight;
                                if (diffWeight > 0.05) {
                                    const unitTaraG = Math.round((diffWeight / finalQty) * 1000);
                                    if (unitTaraG > 0 && unitTaraG < 5000) {
                                        updateForm('tara', unitTaraG.toString());
                                        showToast(`Tara calculada: ${unitTaraG}g por volume`, 'info');
                                    }
                                }
                            }
                            showToast('Dados da Nota Fiscal unificados com sucesso!', 'success');
                        }
                    }}
                />
            )}

            {/* Product Picker — shown when NF has multiple products */}
            {showProductPicker && (
                <div className="fixed inset-0 z-[400] flex flex-col justify-end">
                    <div className="absolute inset-0" onClick={() => setShowProductPicker(false)} />
                    <div className="relative animate-slide-up">
                        <div className="mx-3 mb-3 bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xl">
                            {/* Blue accent stripe */}
                            <div className="h-1 w-full bg-blue-600" />
                            {/* Handle */}
                            <div className="flex justify-center py-3">
                                <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            </div>

                            <div className="px-5 pb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                            Vários Produtos Detectados
                                        </h3>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                            Selecione o produto para esta pesagem
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                                    {productPickerList.map((prod, idx) => {
                                        const desc = typeof prod === 'string' ? prod : prod.descricao;
                                        const weight = prod.peso_total_kg || prod.peso_total || null;

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    updateForm('product', desc);
                                                    const prodQty = parseFloat(prod.quantidade_unidades) || 0;
                                                    if (prodQty > 0) {
                                                        updateForm('qty', prodQty.toString());
                                                    }
                                                    if (weight) {
                                                        updateForm('note', weight.toString());
                                                        
                                                        // Use header gross weight if this is the only product we are selecting
                                                        // otherwise sync gross with net as fallback.
                                                        const headerGross = pendingFormData?.grossWeight;
                                                        const headerNet = pendingFormData?.totalWeight;
                                                        
                                                        if (headerGross && headerNet && prodQty > 0 && Math.abs(headerNet - weight) < 0.1) {
                                                            // Likely this item represents the whole weight
                                                            updateForm('gross', headerGross.toString());
                                                            const diffWeight = headerGross - headerNet;
                                                            if (diffWeight > 0.05) {
                                                                const unitTaraG = Math.round((diffWeight / prodQty) * 1000);
                                                                if (unitTaraG > 0 && unitTaraG < 5000) {
                                                                    updateForm('tara', unitTaraG.toString());
                                                                }
                                                            }
                                                        } else {
                                                            updateForm('gross', weight.toString()); 
                                                        }
                                                    }
                                                    setShowProductPicker(false);
                                                    showToast('Produto selecionado!', 'success');
                                                }}
                                                className="w-full text-left px-4 py-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-[0.98] transition-all group"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                                                            {desc}
                                                        </span>
                                                        {weight && (
                                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                                                Peso: {weight} KG
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 group-hover:border-blue-500 flex-shrink-0 transition-colors" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal icons needed for V2
const BoxIcon = (props: any) => <Package {...props} />;
