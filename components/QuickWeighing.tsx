import React, { useState, useEffect } from 'react';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';

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
        const savedHistory = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
        const savedProducts = JSON.parse(localStorage.getItem(PROD_KEY) || '[]');
        setHistory(savedHistory);
        setProducts(savedProducts);
    }, []);

    const saveHistory = (newHistory: QuickSession[]) => {
        setHistory(newHistory);
        localStorage.setItem(SESSION_KEY, JSON.stringify(newHistory));
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

            {/* Top Metrics Row - Two Columns for Total and Difference */}
            <div className="grid grid-cols-2 gap-3 px-1">
                {/* Total Weight Card */}
                <div className={`relative bg-gradient-blue-card rounded-[2.5rem] p-5 flex flex-col items-center justify-center min-h-[150px] blue-card-shadow border border-white/30 overflow-hidden glint-effect transition-all ${totalWeight > 0 ? 'shadow-xl' : 'opacity-80'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/80 absolute top-5">PESO TOTAL</span>
                    <div className="flex flex-col items-center justify-center mt-3">
                        <div className="flex items-baseline text-white drop-shadow-lg">
                            <span className="text-[2.5rem] font-black tracking-[-0.03em] tabular-nums leading-none">{Math.floor(totalWeight)}</span>
                            <span className="text-lg font-bold opacity-70">.{totalWeight.toFixed(2).split('.')[1]}</span>
                        </div>
                        <span className="text-[9px] font-black text-white/50 tracking-[0.2em] mt-1 uppercase">KG</span>
                    </div>
                </div>

                {/* Difference Card - Matches main screen style */}
                <div className="glass-premium rounded-[2.5rem] flex flex-col min-h-[150px] shadow-sm overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-md p-3 relative">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-2">DIFERENCIA</span>

                        {currentNota > 0 ? (
                            <div className={`text-xl font-black px-4 py-1.5 rounded-full flex items-center gap-1 transition-colors duration-500 ${Math.abs(difference) > 0.2 ? 'text-red-500 bg-red-50/50 dark:bg-red-900/10' : 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'}`}>
                                <span className="text-sm">{difference > 0 ? '+' : ''}</span>
                                {difference.toFixed(2)}
                            </div>
                        ) : (
                            <div className="text-zinc-300 dark:text-zinc-600 flex flex-col items-center">
                                <span className="material-icons-round text-xl mb-1">calculate</span>
                                <span className="text-[8px] font-black uppercase tracking-tighter">Ingrese Nota</span>
                            </div>
                        )}

                        {/* Tiny Note Reference */}
                        <div className="absolute bottom-3 flex items-center gap-1 opacity-40">
                            <span className="material-icons-round text-[10px]">receipt_long</span>
                            <span className="text-[9px] font-bold">Nota: {currentNota.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Card - Re-styled to match main WeighingForm */}
            <div className="glass-premium rounded-[2.2rem] p-6 shadow-lg space-y-6 mx-1">
                {/* Product Input */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-orange-500 shadow-inner">
                        <span className="material-icons-round text-2xl">inventory_2</span>
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produto</label>
                        <input
                            list="quick-products"
                            value={product}
                            onChange={(e) => setProduct(e.target.value)}
                            className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300 transition-colors"
                            placeholder="Nome do produto"
                        />
                        <datalist id="quick-products">
                            {products.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                </div>

                {/* Weights Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0 text-purple-500 shadow-inner">
                            <span className="material-icons-round text-2xl">scale</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Peso Bruto</label>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={bruto}
                                    onChange={(e) => setBruto(e.target.value)}
                                    className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300 transition-colors"
                                    placeholder="0.00"
                                />
                                <span className="text-[10px] font-bold text-zinc-400">kg</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-500 shadow-inner">
                            <span className="material-icons-round text-2xl">receipt_long</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Peso Nota</label>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={notaWeight}
                                    onChange={(e) => setNotaWeight(e.target.value)}
                                    className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-1 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 placeholder:text-zinc-300 transition-colors"
                                    placeholder="0.00"
                                />
                                <span className="text-[10px] font-bold text-zinc-400">kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-500">
                            <span className="material-icons-round text-xl">event</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Fabricação</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={manufacturingDate}
                                onChange={handleDateChange(setManufacturingDate)}
                                className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-0.5 text-xs font-bold text-zinc-800 dark:text-gray-200 outline-none focus:border-blue-500"
                                placeholder="DD/MM/YY"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 text-red-500">
                            <span className="material-icons-round text-xl">history_toggle_off</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Vencimento</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={expirationDate}
                                onChange={handleDateChange(setExpirationDate)}
                                className="w-full bg-transparent border-b border-zinc-100 dark:border-white/10 py-0.5 text-xs font-bold text-zinc-800 dark:text-gray-200 outline-none focus:border-blue-500"
                                placeholder="DD/MM/YY"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Items List - Modernized cards */}
            {items.length > 0 && (
                <div className="px-1 space-y-3 animate-fade-in">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4 mb-2">Itens da Sessão</h3>
                    {items.map((item, i) => (
                        <div key={i} className="glass-premium rounded-3xl p-4 flex items-center justify-between shadow-sm border-white/50 dark:border-white/5 active:scale-95 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    <span className="material-icons-round text-xl">inventory_2</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-zinc-800 dark:text-white leading-tight">{item.produto}</span>
                                    <span className="text-xs font-bold text-blue-500">{item.peso.toFixed(2)} kg</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveItem(i)}
                                className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center transition-colors"
                            >
                                <span className="material-icons-round text-lg">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* History Section - Enhanced visuals */}
            <div className="mt-10 px-1">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-4 mb-4 font-outfit">Historial de Sessões</h3>
                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="text-center py-10 opacity-30">
                            <span className="material-icons-round text-4xl mb-2">history_toggle_off</span>
                            <p className="text-xs font-bold">Nenhuma sessão guardada</p>
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
                                <div key={sIdx} className="glass-premium rounded-[2.2rem] overflow-hidden shadow-sm border-white/40 dark:border-white/5">
                                    <div
                                        className="p-6 flex items-center justify-between cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors"
                                        onClick={() => setExpandedSession(isExpanded ? null : sIdx)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                                                <span className="material-icons-round">task_alt</span>
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-zinc-800 dark:text-white leading-tight">{session.total.toFixed(2)} kg</p>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1 tracking-tighter">{session.data}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDeleteSession(sIdx, e)}
                                                className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 flex items-center justify-center active:scale-95 transition-all"
                                            >
                                                <span className="material-icons-round text-lg">delete</span>
                                            </button>
                                            <span className={`material-icons-round text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-6 pt-0 space-y-3 animate-fade-in bg-zinc-50/30 dark:bg-black/10">
                                            {Object.entries(grouped).map(([prod, data], pIdx) => (
                                                <div key={pIdx} className="bg-white/80 dark:bg-zinc-900/80 rounded-[1.5rem] p-4 shadow-sm border border-zinc-100 dark:border-white/5">
                                                    <div
                                                        className="flex justify-between items-center cursor-pointer"
                                                        onClick={() => setExpandedProduct(expandedProduct === `${sIdx}_${pIdx}` ? null : `${sIdx}_${pIdx}`)}
                                                    >
                                                        <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">{prod}</span>
                                                        <div className="text-right">
                                                            <p className="text-xs font-black text-blue-500">{data.total.toFixed(2)} kg</p>
                                                            <p className="text-[9px] font-bold text-zinc-400 uppercase">{data.pesagens.length} pesagens</p>
                                                        </div>
                                                    </div>

                                                    {expandedProduct === `${sIdx}_${pIdx}` && (
                                                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-white/5 space-y-2 animate-fade-in">
                                                            {data.pesagens.map((p, i) => (
                                                                <div key={i} className="flex justify-between items-start text-[10px] bg-zinc-50 dark:bg-black/20 p-2 rounded-xl">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Bruto</span>
                                                                        <span className="text-zinc-800 dark:text-zinc-200 font-black">{p.bruto} kg</span>
                                                                    </div>
                                                                    {p.nota && (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Nota</span>
                                                                            <span className="text-blue-500 font-black">{p.nota} kg</span>
                                                                        </div>
                                                                    )}
                                                                    {p.manufacturingDate && (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Fab</span>
                                                                            <span className="text-zinc-600 dark:text-gray-400 font-bold">{p.manufacturingDate}</span>
                                                                        </div>
                                                                    )}
                                                                    {p.expirationDate && (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Venc</span>
                                                                            <span className="text-red-400 font-bold">{p.expirationDate}</span>
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

            {/* Bottom Bar - Redesigned to match FAB style */}
            <div className="fixed bottom-24 left-5 right-5 z-[50] flex justify-center gap-3 animate-slide-up">
                <div className="glass-premium p-3 rounded-[2.5rem] flex gap-3 shadow-2xl ring-1 ring-white/20 border border-white/50 backdrop-blur-2xl">
                    <button
                        onClick={handleAdd}
                        className="h-16 px-8 rounded-[1.8rem] bg-blue-500 text-white font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-blue-500/30 active:scale-95 transition-all outline-none"
                    >
                        Adicionar
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="h-16 w-16 rounded-[1.8rem] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center active:scale-95 transition-all outline-none"
                    >
                        <span className="material-icons-round">delete_sweep</span>
                    </button>
                    <button
                        onClick={handleSaveSession}
                        disabled={items.length === 0}
                        className={`h-16 px-8 rounded-[1.8rem] bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-emerald-500/30 active:scale-95 transition-all outline-none ${items.length === 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};
