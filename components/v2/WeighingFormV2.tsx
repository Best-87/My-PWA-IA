
import React, { useState, useRef, useMemo } from 'react';
import {
    Scale, Package, ShoppingCart, Calendar, Tag, Thermometer,
    Camera, Image as ImageIcon, Trash2, Save, History, ChevronDown,
    AlertTriangle, Check, FileText, Info, BarChart3, Scan as ScanIcon, ChevronRight
} from 'lucide-react';
import { WeighingFormProps } from '../WeighingForm';
import { NFScanner } from './NFScanner';
import { useToast } from '../Toast';
import { saveRecord } from '../../services/storageService';
import { trackEvent } from '../../services/analyticsService';

export const WeighingFormV2: React.FC<WeighingFormProps> = ({ onViewHistory, onDataChange, onRecordSaved }) => {
    const { showToast } = useToast();
    const [isPackExpanded, setIsPackExpanded] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerMode, setScannerMode] = useState<'nf' | 'label'>('nf');

    // Basic states to keep it compatible and functional for testing
    const [form, setForm] = useState({
        supplier: '',
        product: '',
        gross: '',
        note: '',
        qty: '',
        tara: '0',
        batch: '',
        exp: '',
        storage: 'dry',
        cnpj: '',
        noteNumber: '',
        evidence: null as string | null
    });

    const parsedGross = parseFloat(form.gross.replace(',', '.')) || 0;
    const parsedNote = parseFloat(form.note.replace(',', '.')) || 0;
    const parsedQty = parseFloat(form.qty) || 0;
    const parsedTara = (parseFloat(form.tara) / 1000) || 0; // g to kg
    const totalTara = parsedQty * parsedTara;
    const netWeight = parsedGross > 0 ? parsedGross - totalTara : 0;
    const diff = netWeight - parsedNote;
    const isOk = Math.abs(diff) <= 0.2;

    const updateForm = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
        if (onDataChange) onDataChange(true);
    };

    const handleSave = async () => {
        if (!form.supplier || !form.product || !form.gross) {
            showToast("Preencha Fornecedor, Produto e Peso Bruto", "error");
            return;
        }

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

            const result: any = await saveRecord(record as any);
            if (result?.error) throw new Error(result.error);

            showToast("Conferência salva com sucesso!", "success");

            // Reset form
            setForm({
                supplier: '', product: '', gross: '', note: '',
                qty: '', tara: '0', batch: '', exp: '',
                storage: 'dry', cnpj: '', noteNumber: '',
                evidence: null
            });

            if (onRecordSaved) onRecordSaved();
        } catch (error) {
            console.error("Save Error:", error);
            showToast("Erro ao salvar", "error");
        }
    };

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
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Bruto</span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{parsedGross.toFixed(3)}</span>
                    </div>
                    <div className="text-center border-x border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Líquido</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-white">{netWeight.toFixed(3)}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Nota</span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{parsedNote.toFixed(3)}</span>
                    </div>
                </div>
            </div>

            {/* 2. OCR Scanners Triggers */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => { setScannerMode('nf'); setShowScanner(true); }}
                    className="group bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-2xl text-white shadow-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                >
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black block uppercase tracking-tighter">Scanner NF-e</span>
                    </div>
                </button>

                <button
                    onClick={() => { setScannerMode('label'); setShowScanner(true); }}
                    className="group bg-gradient-to-br from-purple-600 to-fuchsia-700 p-3 rounded-2xl text-white shadow-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                >
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Tag className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black block uppercase tracking-tighter">Scanner Rótulo</span>
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
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <BoxIcon className="w-4 h-4" /> Embalagem & Tara
                        </h3>
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
                                    placeholder="0"
                                    className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-sm font-black text-center"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tara (g)</label>
                                <input
                                    type="number"
                                    value={form.tara}
                                    onChange={e => updateForm('tara', e.target.value)}
                                    placeholder="0"
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block ml-1">Peso Bruto</label>
                            <input
                                type="text"
                                value={form.gross}
                                onChange={e => updateForm('gross', e.target.value)}
                                placeholder="0.000"
                                className="w-full p-4 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black border-none focus:ring-4 focus:ring-blue-500/30 text-xl font-black text-center shadow-lg"
                            />
                        </div>
                        <div className="relative">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block ml-1">Peso Nota</label>
                            <input
                                type="text"
                                value={form.note}
                                onChange={e => updateForm('note', e.target.value)}
                                placeholder="0.000"
                                className="w-full p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-900/30 text-blue-600 focus:ring-4 focus:ring-blue-500/30 text-xl font-black text-center"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pb-4">
                <button
                    onClick={() => setForm({ supplier: '', product: '', gross: '', note: '', qty: '', tara: '0', batch: '', exp: '', storage: 'dry', cnpj: '', noteNumber: '', evidence: null })}
                    className="py-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                >
                    <Trash2 className="w-4 h-4" /> Limpar
                </button>
                <button
                    onClick={handleSave}
                    className="py-3.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all text-sm"
                >
                    <Save className="w-4 h-4" /> Salvar
                </button>
            </div>

            {showScanner && (
                <NFScanner
                    mode={scannerMode}
                    onDataExtracted={(data) => {
                        if (scannerMode === 'nf') {
                            // NF Priority: supplier, weights, doc numbers
                            if (data.grossWeight) updateForm('gross', data.grossWeight.toString());
                            if (data.totalWeight) updateForm('note', data.totalWeight.toString());
                            if (data.cnpj) updateForm('cnpj', data.cnpj);
                            if (data.invoiceNumber) updateForm('noteNumber', data.invoiceNumber);
                            if (data.supplier) updateForm('supplier', data.supplier);
                            if (data.evidence) updateForm('evidence', data.evidence);
                            showToast("Nota Fiscal processada!", "success");
                        } else {
                            // Label Logic: fill product/tara if missing, supplier only if empty
                            if (data.product && !form.product) updateForm('product', data.product);
                            if (data.batch) updateForm('batch', data.batch);
                            if (data.expirationDate) updateForm('exp', data.expirationDate);
                            if (data.unitTara && !form.tara || form.tara === '0') updateForm('tara', data.unitTara.toString());

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
        </div>
    );
};

// Internal icons needed for V2
const BoxIcon = (props: any) => <Package {...props} />;
