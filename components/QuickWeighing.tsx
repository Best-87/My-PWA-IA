import React, { useState, useEffect } from 'react';
import { useTranslation } from '../services/i18n';
import { useToast } from './Toast';

interface QuickItem {
    produto: string;
    peso: number; // Neto
    bruto: number;
    tara: number; // g
}

interface QuickSession {
    data: string;
    total: number;
    itens: QuickItem[];
}

export const QuickWeighing: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();

    // Logic from snippet
    const SESSION_KEY = "sessoesPesagem";
    const PROD_KEY = "produtosPesagem";

    const [items, setItems] = useState<QuickItem[]>([]);
    const [history, setHistory] = useState<QuickSession[]>([]);
    const [products, setProducts] = useState<string[]>([]);

    // Form states
    const [product, setProduct] = useState("");
    const [tara, setTara] = useState("");
    const [bruto, setBruto] = useState("");
    const [nota, setNota] = useState(""); // Note field from snippet (though not used in its add() logic, it's in the UI)

    // Expand states for history
    const [expandedSession, setExpandedSession] = useState<number | null>(null);
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

    useEffect(() => {
        // Load history and products
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
        const taraVal = parseFloat(tara) || 0;

        if (!prodTrim || isNaN(brutoVal) || brutoVal <= 0) {
            showToast("Preencha produto e peso bruto", "warning");
            return;
        }

        // Add to products list if new
        if (!products.includes(prodTrim)) {
            const updatedProducts = [...products, prodTrim];
            saveProducts(updatedProducts);
        }

        const neto = brutoVal - (taraVal / 1000);
        if (neto > 0) {
            setItems([...items, { produto: prodTrim, peso: neto, bruto: brutoVal, tara: taraVal }]);
            setBruto("");
            // keep product and tara for quick subsequent adds? User's snippet cleared only bruto
        } else {
            showToast("Peso neto deve ser maior que zero", "error");
        }
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
        setTara("");
        setNota("");
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
        setItems([]);
        handleClearAll();
        showToast("Sessão guardada com sucesso", "success");
    };

    const handleDeleteSession = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newHistory = [...history];
        newHistory.splice(index, 1);
        saveHistory(newHistory);
    };

    const totalNet = items.reduce((acc, item) => acc + item.peso, 0);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <h2 className="text-2xl font-black text-center text-zinc-900 dark:text-white mt-4 mb-2">Resumo de Pesagem</h2>

            {/* Input Card */}
            <div className="glass-premium rounded-[2.2rem] p-6 shadow-lg space-y-4">
                <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Produto</label>
                    <input
                        list="quick-products"
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl px-5 py-4 text-base font-bold outline-none border border-zinc-100 dark:border-white/5 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
                        placeholder="Nome do produto"
                    />
                    <datalist id="quick-products">
                        {products.map(p => <option key={p} value={p} />)}
                    </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tara (g)</label>
                        <input
                            type="number"
                            value={tara}
                            onChange={(e) => setTara(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl px-5 py-4 text-base font-bold outline-none border border-zinc-100 dark:border-white/5 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nota (kg)</label>
                        <input
                            type="number"
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl px-5 py-4 text-base font-bold outline-none border border-zinc-100 dark:border-white/5 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Peso Bruto (kg)</label>
                    <input
                        type="number"
                        value={bruto}
                        onChange={(e) => setBruto(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl px-5 py-4 text-base font-bold outline-none border border-zinc-100 dark:border-white/5 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
                        placeholder="0.00"
                    />
                </div>
            </div>

            {/* Current Items List */}
            {items.length > 0 && (
                <div className="glass-premium rounded-[2.2rem] p-4 shadow-lg overflow-hidden animate-fade-in">
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                        {items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-4 px-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-zinc-800 dark:text-white">{item.produto}</span>
                                    <span className="text-xs font-bold text-blue-500">{item.peso.toFixed(2)} kg <span className="text-[10px] text-zinc-400 font-normal ml-1">(B: {item.bruto} T: {item.tara}g)</span></span>
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(i)}
                                    className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center btn-press"
                                >
                                    <span className="material-icons-round text-lg">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Total Card */}
            <div className={`glass-premium rounded-[2.2rem] p-6 shadow-lg flex justify-between items-center transition-all ${totalNet > 0 ? 'bg-emerald-50/30 border-emerald-500/20' : ''}`}>
                <span className="text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Neto Total</span>
                <span className="text-2xl font-black text-zinc-900 dark:text-white">{totalNet.toFixed(2).replace('.', ',')} kg</span>
            </div>

            {/* History Section */}
            <div className="mt-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-4 mb-4">Historial de Sessões</h3>
                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="text-center py-10 opacity-30">
                            <span className="material-icons-round text-4xl mb-2">history_toggle_off</span>
                            <p className="text-xs font-bold">Nenhuma sessão guardada</p>
                        </div>
                    ) : (
                        history.map((session, sIdx) => {
                            // Group by product for display (as in user snippet)
                            const grouped: Record<string, { total: number, pesagens: QuickItem[] }> = {};
                            session.itens.forEach(item => {
                                if (!grouped[item.produto]) grouped[item.produto] = { total: 0, pesagens: [] };
                                grouped[item.produto].total += item.peso;
                                grouped[item.produto].pesagens.push(item);
                            });

                            const isExpanded = expandedSession === sIdx;

                            return (
                                <div key={sIdx} className="glass-premium rounded-[1.8rem] overflow-hidden shadow-sm border-white/40 dark:border-white/5">
                                    <div
                                        className="p-5 flex items-center justify-between cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors"
                                        onClick={() => setExpandedSession(isExpanded ? null : sIdx)}
                                    >
                                        <div>
                                            <p className="text-lg font-black text-zinc-800 dark:text-white leading-tight">{session.total.toFixed(2).replace('.', ',')} kg</p>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">{session.data}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDeleteSession(sIdx, e)}
                                                className="text-red-500 text-[10px] font-black uppercase tracking-tighter px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 active:scale-95"
                                            >
                                                Excluir
                                            </button>
                                            <span className={`material-icons-round text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-4 pt-0 space-y-3 animate-fade-in bg-zinc-50/50 dark:bg-black/10">
                                            {Object.entries(grouped).map(([prod, data], pIdx) => (
                                                <div key={pIdx} className="bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-sm border border-zinc-100 dark:border-white/5">
                                                    <div
                                                        className="flex justify-between items-center cursor-pointer"
                                                        onClick={() => setExpandedProduct(expandedProduct === `${sIdx}_${pIdx}` ? null : `${sIdx}_${pIdx}`)}
                                                    >
                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200">{prod}</span>
                                                        <span className="text-xs font-bold text-blue-500">{data.total.toFixed(2)} kg ({data.pesagens.length}x)</span>
                                                    </div>

                                                    {expandedProduct === `${sIdx}_${pIdx}` && (
                                                        <div className="mt-2 pt-2 border-t border-zinc-50 dark:border-white/5 space-y-1 animate-fade-in">
                                                            {data.pesagens.map((p, i) => (
                                                                <p key={i} className="text-[10px] text-zinc-500 font-bold flex justify-between">
                                                                    <span>Bruto: {p.bruto} kg | Tara: {p.tara} g</span>
                                                                    <span className="text-zinc-800 dark:text-zinc-300">{p.peso.toFixed(2)} kg</span>
                                                                </p>
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

            {/* Bottom Bar - FAB style like the snippet */}
            <div className="fixed bottom-24 left-5 right-5 z-[50] flex justify-center gap-3 animate-slide-up">
                <div className="glass-premium p-3 rounded-[2rem] flex gap-3 shadow-2xl ring-1 ring-white/20">
                    <button
                        onClick={handleAdd}
                        className="h-14 px-6 rounded-2xl bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all outline-none"
                    >
                        Adicionar
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-black text-xs uppercase tracking-widest active:scale-95 transition-all outline-none"
                    >
                        Limpar
                    </button>
                    <button
                        onClick={handleSaveSession}
                        disabled={items.length === 0}
                        className={`h-14 px-6 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all outline-none ${items.length === 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};
