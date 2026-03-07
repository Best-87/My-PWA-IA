import React, { useState, useEffect } from 'react';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';
import { syncQuickSessionToSupabase, fetchQuickSessionsFromSupabase, clearAllQuickSessionsFromSupabase } from '../services/supabaseService';

interface QuickItem {
    produto: string;
    peso: number;
    bruto: number;
    nota?: number;
    manufacturingDate?: string;
    expirationDate?: string;
}

interface QuickSession {
    data: string;
    total: number;
    itens: QuickItem[];
}

export const QuickWeighing: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const SESSION_KEY = "sessoesPesagem";
    const PROD_KEY = "produtosPesagem";

    const [items, setItems] = useState<QuickItem[]>([]);
    const [history, setHistory] = useState<QuickSession[]>([]);
    const [products, setProducts] = useState<string[]>([]);

    // Form states
    const [product, setProduct] = useState("");
    const [bruto, setBruto] = useState("");
    const [notaWeight, setNotaWeight] = useState("");
    const [manufacturingDate, setManufacturingDate] = useState("");
    const [expirationDate, setExpirationDate] = useState("");

    // Date auto-formatter
    const formatDate = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    };

    const handleDateChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDate(e.target.value);
        if (formatted.length <= 10) setter(formatted);
    };

    // Expand states for history
    const [expandedSession, setExpandedSession] = useState<number | null>(null);
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            const savedHistory = await fetchQuickSessionsFromSupabase();
            const savedProducts = JSON.parse(localStorage.getItem(PROD_KEY) || '[]'); // Products can stay in lightweight cache
            setHistory(savedHistory);
            setProducts(savedProducts);
        };
        loadHistory();
    }, []);

    const saveHistory = async (newHistory: QuickSession[]) => {
        setHistory(newHistory);
        // We sync only the NEWEST session to Supabase as a record
        if (newHistory.length > 0) {
            await syncQuickSessionToSupabase(newHistory[0]);
        }
    };

    const saveProducts = (newProducts: string[]) => {
        setProducts(newProducts);
        localStorage.setItem(PROD_KEY, JSON.stringify(newProducts));
    };

    const handleAdd = () => {
        const prodTrim = product.trim();
        const brutoVal = parseFloat(bruto.replace(',', '.'));
        const notaVal = notaWeight ? parseFloat(notaWeight.replace(',', '.')) : undefined;

        if (!prodTrim || isNaN(brutoVal) || brutoVal <= 0) {
            showToast("Preencha produto e peso bruto", "warning");
            return;
        }

        if (!products.includes(prodTrim)) {
            const updatedProducts = [...products, prodTrim];
            saveProducts(updatedProducts);
        }

        setItems([...items, {
            produto: prodTrim,
            peso: brutoVal,
            bruto: brutoVal,
            nota: notaVal,
            manufacturingDate: manufacturingDate || undefined,
            expirationDate: expirationDate || undefined
        }]);
        setBruto("");
        showToast("Adicionado", "success");
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleClearHistory = async () => {
        await clearAllQuickSessionsFromSupabase();
        setHistory([]);
        showToast("Historial borrado de la nube", "info");
    };

    const handleClearAll = () => {
        setItems([]);
        setProduct("");
        setBruto("");
        setNotaWeight("");
        setManufacturingDate("");
        setExpirationDate("");
    };

    const handleSaveSession = () => {
        if (items.length === 0) return;

        const total = items.reduce((acc, item) => acc + item.peso, 0);
        const newSession: QuickSession = {
            data: new Date().toLocaleString("pt-BR"),
            total: total,
            itens: [...items]
        };

        const newHistory = [newSession, ...history];
        saveHistory(newHistory);
        handleClearAll();
        showToast("Sessão guardada", "success");
    };

    const handleDeleteSession = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newHistory = [...history];
        newHistory.splice(index, 1);
        saveHistory(newHistory);
    };

    const totalWeight = items.reduce((acc, item) => acc + item.peso, 0);
    const currentNota = parseFloat(notaWeight.replace(',', '.')) || 0;
    const difference = totalWeight - currentNota;

    return (
        <div className="space-y-6 animate-fade-in pb-32">
            <h2 className="text-2xl font-black text-center text-zinc-900 dark:text-white mt-4 mb-2">Pesagem Rápida</h2>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 gap-2 px-1">
                {/* Total Weight Card */}
                <div className={`relative bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 rounded p-4 flex flex-col items-center justify-center min-h-[120px] transition-opacity ${totalWeight > 0 ? 'opacity-100' : 'opacity-80'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 absolute top-3">PESO TOTAL</span>
                    <div className="flex flex-col items-center justify-center mt-4">
                        <div className="flex items-baseline text-white">
                            <span className="text-4xl font-mono font-bold tracking-tight leading-none">{Math.floor(totalWeight)}</span>
                            <span className="text-xl font-mono font-bold text-zinc-400">.{totalWeight.toFixed(2).split('.')[1]}</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 tracking-widest mt-1 uppercase">KG</span>
                    </div>
                </div>

                {/* Difference Card */}
                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded flex flex-col min-h-[120px]">
                    <div className="flex-1 flex flex-col items-center justify-center p-3 relative">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">DIFERENCIA</span>

                        {currentNota > 0 ? (
                            <div className={`text-xl font-mono font-bold px-3 py-1 rounded border-2 transition-colors duration-500 ${Math.abs(difference) > 0.2 ? 'text-red-700 border-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'text-emerald-700 border-emerald-500 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                <span className="text-sm">{difference > 0 ? '+' : ''}</span>
                                {difference.toFixed(2)}
                            </div>
                        ) : (
                            <div className="text-zinc-400 flex flex-col items-center">
                                <span className="material-icons-round text-xl mb-1">calculate</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-center">INGRESE NOTA</span>
                            </div>
                        )}

                        {/* Tiny Note Reference */}
                        <div className="absolute bottom-2 flex items-center gap-1 opacity-60">
                            <span className="material-icons-round text-[10px] text-zinc-500">receipt_long</span>
                            <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">NOTA: {currentNota.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Card */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded p-4 space-y-4 mx-1">
                {/* Product Input */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-orange-600">
                        <span className="material-icons-round text-xl">inventory_2</span>
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">PRODUTO</label>
                        <input
                            list="quick-products"
                            value={product}
                            onChange={(e) => setProduct(e.target.value)}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-400 uppercase transition-colors"
                            placeholder="NOME DO PRODUTO"
                        />
                        <datalist id="quick-products">
                            {products.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                </div>

                {/* Weights Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">PESO BRUTO</label>
                            <div className="flex items-center gap-1">
                                <span className="material-icons-round text-zinc-400 text-sm">scale</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={bruto}
                                    onChange={(e) => setBruto(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-400 uppercase transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">PESO NOTA</label>
                            <div className="flex items-center gap-1">
                                <span className="material-icons-round text-zinc-400 text-sm">receipt_long</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={notaWeight}
                                    onChange={(e) => setNotaWeight(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-400 uppercase transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-zinc-100 dark:border-zinc-800">
                    <div>
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                            <span className="material-icons-round text-[10px]">event</span> FABRICAÇÃO
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={manufacturingDate}
                            onChange={handleDateChange(setManufacturingDate)}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-400 transition-colors"
                            placeholder="DD/MM/YY"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                            <span className="material-icons-round text-[10px]">history_toggle_off</span> VENCIMIENTO
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={expirationDate}
                            onChange={handleDateChange(setExpirationDate)}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-400 transition-colors"
                            placeholder="DD/MM/YY"
                        />
                    </div>
                </div>
            </div>

            {/* Current Items List - Modernized cards */}
            {items.length > 0 && (
                <div className="px-1 space-y-3 animate-fade-in">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4 mb-2">Itens da Sessão</h3>
                    {items.map((item, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded p-3 flex items-center justify-between shadow-sm active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                    <span className="material-icons-round text-sm">inventory_2</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">{item.produto}</span>
                                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{item.peso.toFixed(2)} kg</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveItem(i)}
                                className="w-8 h-8 rounded border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-red-500 flex items-center justify-center hover:border-red-500 active:bg-zinc-200 transition-colors"
                            >
                                <span className="material-icons-round text-lg">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* History Section */}
            <div className="mt-8 px-1">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">HISTORIAL DE SESSÕES</h3>
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-10 opacity-50 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded">
                            <span className="material-icons-round text-4xl mb-2 text-zinc-400">history_toggle_off</span>
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">NENHUMA SESSÃO</p>
                        </div>
                    ) : (
                        history.map((session, sIdx) => {
                            const grouped: Record<string, { total: number, pesagens: QuickItem[] }> = {};
                            session.itens.forEach(item => {
                                if (!grouped[item.produto]) grouped[item.produto] = { total: 0, pesagens: [] };
                                grouped[item.produto].total += item.peso;
                                grouped[item.produto].pesagens.push(item);
                            });

                            const isExpanded = expandedSession === sIdx;

                            return (
                                <div key={sIdx} className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded overflow-hidden">
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                                        onClick={() => setExpandedSession(isExpanded ? null : sIdx)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                                <span className="material-icons-round text-lg">task_alt</span>
                                            </div>
                                            <div>
                                                <p className="text-lg font-mono font-bold text-zinc-900 dark:text-white leading-tight">{session.total.toFixed(2)} kg</p>
                                                <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1 tracking-widest">{session.data}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDeleteSession(sIdx, e)}
                                                className="w-10 h-10 rounded border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-red-500 flex items-center justify-center hover:border-red-500 active:bg-zinc-200 transition-colors"
                                            >
                                                <span className="material-icons-round text-lg">delete</span>
                                            </button>
                                            <div className="w-10 h-10 flex items-center justify-center">
                                                <span className={`material-icons-round text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-4 pt-0 border-t-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black/20 space-y-3 mt-2 pt-4">
                                            {Object.entries(grouped).map(([prod, data], pIdx) => (
                                                <div key={pIdx} className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded p-3">
                                                    <div
                                                        className="flex justify-between items-center cursor-pointer"
                                                        onClick={() => setExpandedProduct(expandedProduct === `${sIdx}_${pIdx}` ? null : `${sIdx}_${pIdx}`)}
                                                    >
                                                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{prod}</span>
                                                        <div className="text-right">
                                                            <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{data.total.toFixed(2)} kg</p>
                                                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{data.pesagens.length} REGISTROS</p>
                                                        </div>
                                                    </div>

                                                    {expandedProduct === `${sIdx}_${pIdx}` && (
                                                        <div className="mt-3 pt-3 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                                                            {data.pesagens.map((p, i) => (
                                                                <div key={i} className="flex justify-between items-start text-[10px] bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">BRUTO</span>
                                                                        <span className="text-zinc-900 dark:text-white font-mono font-bold">{p.bruto} kg</span>
                                                                    </div>
                                                                    {p.nota && (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">NOTA</span>
                                                                            <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">{p.nota} kg</span>
                                                                        </div>
                                                                    )}
                                                                    {p.manufacturingDate && (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">FAB</span>
                                                                            <span className="text-zinc-700 dark:text-zinc-300 font-mono font-bold">{p.manufacturingDate}</span>
                                                                        </div>
                                                                    )}
                                                                    {p.expirationDate && (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">VENC</span>
                                                                            <span className="text-red-600 dark:text-red-400 font-mono font-bold">{p.expirationDate}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-[4.5rem] left-0 right-0 z-[49] bg-white border-t-4 border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 p-3 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                <div className="max-w-lg mx-auto flex gap-2">
                    <button
                        onClick={handleAdd}
                        className="flex-1 h-14 bg-blue-600 active:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded transition-colors"
                        disabled={!product.trim() || !bruto}
                    >
                        ADICIONAR
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="w-14 h-14 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
                    >
                        <span className="material-icons-round">delete_sweep</span>
                    </button>
                    <button
                        onClick={handleSaveSession}
                        disabled={items.length === 0}
                        className={`flex-1 h-14 font-bold text-xs uppercase tracking-widest rounded transition-colors ${items.length === 0 ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 pointer-events-none' : 'bg-emerald-600 active:bg-emerald-700 text-white'}`}
                    >
                        GUARDAR
                    </button>
                </div>
            </div>
        </div>
    );
};
