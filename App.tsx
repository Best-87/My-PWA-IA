import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InstallManager } from './components/InstallManager';
import { WeighingForm, WeighingFormHandle } from './components/WeighingForm';
import { getRecords, deleteRecord, clearAllRecords, getUserProfile, saveUserProfile, getTheme, saveTheme } from './services/storageService';
import { WeighingRecord, Language, UserProfile } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { ToastProvider, useToast } from './components/Toast';
import { InstallPrompt } from './components/InstallPrompt';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { initAnalytics, trackEvent } from './services/analyticsService';
import { getNotificationPermission, requestNotificationPermission, isNotificationSupported } from './services/notificationService';

// Tolerance limit 200g
const TOLERANCE_KG = 0.2;

// --- HELPER: Expiration Logic ---
const checkExpirationRisk = (dateStr?: string): string | null => {
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

    if (diffDays < 0) return `VENCIDO (${Math.abs(diffDays)}d)`;
    if (diffDays <= 7) return `CRÍTICO (${diffDays}d)`;
    return null;
};

// --- COMPONENT: Full Screen Image Modal ---
const FullScreenImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
    return (
        <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 backdrop-blur-md">
                <span className="material-icons-round text-3xl">close</span>
            </button>
            <img src={src} alt="Evidence Full Screen" className="max-w-full max-h-[90vh] object-contain rounded-[2rem] shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

// --- COMPONENT: Refined History Item ---
const HistoryItem: React.FC<{ 
    record: WeighingRecord; 
    onDelete: (id: string) => void;
    onShare: (record: WeighingRecord) => void;
    onViewImage: (src: string) => void;
}> = ({ record, onDelete, onShare, onViewImage }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const netWeight = typeof record.netWeight === 'number' ? record.netWeight : 0;
    const noteWeight = typeof record.noteWeight === 'number' ? record.noteWeight : 0;
    const taraTotal = typeof record.taraTotal === 'number' ? record.taraTotal : 0;
    const diff = netWeight - noteWeight;
    const isWeightError = Math.abs(diff) > TOLERANCE_KG;
    const riskMsg = checkExpirationRisk(record.expirationDate);

    // Determine Status Colors
    let statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    let cardBorder = 'border-zinc-200/60 dark:border-zinc-800';
    
    if (riskMsg) {
        statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        cardBorder = 'border-red-200 dark:border-red-900/50';
    } else if (isWeightError) {
        statusColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
        cardBorder = 'border-orange-200 dark:border-orange-900/50';
    }

    return (
        <div className={`group bg-white dark:bg-zinc-900 rounded-3xl border ${cardBorder} shadow-sm hover:shadow-md transition-all duration-300 mb-3 overflow-hidden`}>
            
            <div className="p-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-black text-zinc-900 dark:text-white text-sm leading-tight truncate">{record.supplier}</h3>
                             {record.aiAnalysis && <span className="material-icons-round text-[10px] text-purple-500" title="IA Analyzed">smart_toy</span>}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">{record.product}</p>
                    </div>
                    
                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1 ${statusColor}`}>
                        <span className="font-mono font-bold text-lg tracking-tight leading-none">
                            {netWeight.toFixed(2)}
                        </span>
                        <span className="text-[10px] opacity-70 font-sans font-bold">kg</span>
                    </div>
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap gap-2 mt-4 items-center">
                    {/* NEW: Peso Nota Badge */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                        <span className="material-icons-round text-[10px] text-purple-400">description</span>
                        <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300">
                            Nota: {noteWeight.toFixed(2)}
                        </span>
                    </div>

                    {/* NEW: Store Badge */}
                    {record.store && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                            <span className="material-icons-round text-[10px] text-orange-400">store</span>
                            <span className="text-[9px] font-bold text-orange-700 dark:text-orange-300 max-w-[120px] truncate">
                                {record.store}
                            </span>
                        </div>
                    )}

                    {record.productionDate && (
                         <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                             <span className="material-icons-round text-[10px] text-zinc-400">factory</span>
                             <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">{record.productionDate}</span>
                         </div>
                    )}
                    {record.expirationDate && (
                         <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                             <span className="material-icons-round text-[10px] text-zinc-400">event_busy</span>
                             <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">{record.expirationDate}</span>
                         </div>
                    )}
                     {record.boxes && record.boxes.qty > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                            <span className="material-icons-round text-[10px] text-blue-400">layers</span>
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-300">{record.boxes.qty}cx</span>
                        </div>
                    )}
                    {riskMsg && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 animate-pulse">
                            <span className="material-icons-round text-[10px] text-red-500">warning</span>
                            <span className="text-[9px] font-bold text-red-600 dark:text-red-300">{riskMsg}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="bg-zinc-50/50 dark:bg-black/20 px-5 pb-5 pt-2 border-t border-zinc-100 dark:border-zinc-800 animate-slide-down">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 text-xs">
                         <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/50 dark:border-zinc-800 border-dashed">
                            <span className="text-zinc-400 font-medium">Diferencia</span>
                            <span className={`font-mono font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/50 dark:border-zinc-800 border-dashed">
                            <span className="text-zinc-400 font-medium">Tara Total</span>
                            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{taraTotal.toFixed(2)}</span>
                        </div>
                         {record.batch && (
                            <div className="flex justify-between items-center col-span-2 py-1.5 border-b border-zinc-200/50 dark:border-zinc-800 border-dashed">
                                <span className="text-zinc-400 font-medium">Lote</span>
                                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{record.batch}</span>
                            </div>
                        )}
                        {/* Store is now visible in preview, but kept here for completeness in expanded view */}
                        {record.store && (
                            <div className="flex justify-between items-center col-span-2 py-1.5 border-b border-zinc-200/50 dark:border-zinc-800 border-dashed">
                                <span className="text-zinc-400 font-medium">Loja/Tienda</span>
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">{record.store}</span>
                            </div>
                        )}
                        {record.aiAnalysis && (
                            <div className="col-span-2 mt-3 bg-white dark:bg-zinc-800 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                <p className="font-black text-purple-600 dark:text-purple-300 text-[9px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="material-icons-round text-[10px]">smart_toy</span> Análisis IA
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-300 leading-snug font-medium text-[11px]">{record.aiAnalysis}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                        {record.evidence && (
                            <button onClick={(e) => { e.stopPropagation(); onViewImage(record.evidence!); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-sm">
                                <span className="material-icons-round text-lg">image</span>
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onShare(record); }} className="flex-1 h-10 bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-[11px] uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors border border-zinc-200 dark:border-zinc-700">
                            <span className="material-icons-round text-sm">share</span> WhatsApp
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-zinc-200 dark:border-zinc-700 transition-colors">
                            <span className="material-icons-round text-lg">delete</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const { t, language, setLanguage } = useTranslation();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'weigh' | 'history'>('weigh');
    const [records, setRecords] = useState<WeighingRecord[]>([]);
    const [userProfile, setUserProfileState] = useState<UserProfile>(getUserProfile());
    const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const weighingFormRef = useRef<WeighingFormHandle>(null);
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
    const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');

    // WAKE LOCK LOGIC
    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    // console.log('Screen Wake Lock acquired'); 
                }
            } catch (err: any) {
                // Ignore NotAllowedError (expected without user gesture)
                if (err.name !== 'NotAllowedError') {
                    console.error(`Wake Lock Error: ${err}`);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        
        const handleInteraction = () => {
            requestWakeLock();
            // Clean up interaction listeners once triggered
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };

        // Initial request
        requestWakeLock();
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);

        // Check Notification Permission
        setNotificationStatus(getNotificationPermission());

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
            if (wakeLock) wakeLock.release();
        };
    }, []);

    useEffect(() => {
        initAnalytics();
        setRecords(getRecords());
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [theme]);

    // Re-fetch records when switching to history to ensure latest data, 
    // but without unmounting components
    useEffect(() => { 
        if (activeTab === 'history') setRecords(getRecords()); 
    }, [activeTab]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setThemeState(newTheme);
        saveTheme(newTheme);
    };

    const handleEnableNotifications = async () => {
        const result = await requestNotificationPermission();
        setNotificationStatus(result);
        if (result === 'granted') {
            showToast('Notificaciones activadas', 'success');
        } else {
            showToast('Permiso denegado', 'error');
        }
    };

    const handleDeleteRecord = (id: string) => {
        if (confirm(t('msg_confirm_delete'))) {
            deleteRecord(id);
            setRecords(getRecords());
            showToast(t('msg_history_cleared'), 'success');
        }
    };

    const handleShare = (record: WeighingRecord) => {
        const diff = (record.netWeight || 0) - (record.noteWeight || 0);
        const icon = Math.abs(diff) <= TOLERANCE_KG ? '✅' : '⚠️';
        const msg = `${t('rpt_title')}\n${t('rpt_supplier')} ${record.supplier}\n${t('rpt_product')} ${record.product}\n${record.batch ? `${t('rpt_batch')} ${record.batch}\n` : ''}${record.expirationDate ? `${t('rpt_expiration')} ${record.expirationDate}\n` : ''}\n${t('rpt_note')} ${record.noteWeight}kg\n${t('rpt_gross')} ${record.grossWeight}kg\n${t('rpt_tara')} ${record.taraTotal ? record.taraTotal.toFixed(2) : '0.00'}kg\n${t('rpt_net')} ${(record.netWeight || 0).toFixed(2)}kg\n\n${t('rpt_diff')} ${diff > 0 ? '+' : ''}${diff.toFixed(2)}kg ${icon}${record.aiAnalysis ? `\n${t('rpt_ai_obs')} ${record.aiAnalysis}` : ''}`;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
        trackEvent('share_whatsapp', { recordId: record.id });
    };

    const handleProfileSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveUserProfile(userProfile);
        showToast(t('msg_profile_saved'), 'success');
        setIsMenuOpen(false);
    };

    const filteredRecords = records.filter(r => {
        const matchesSearch = r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || r.product.toLowerCase().includes(searchTerm.toLowerCase());
        const recordDate = new Date(r.timestamp);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let matchesPeriod = true;
        if (filterPeriod === 'today') {
            matchesPeriod = recordDate.toDateString() === today.toDateString();
        } else if (filterPeriod === 'week') { 
            const weekAgo = new Date(); 
            weekAgo.setDate(today.getDate() - 7); 
            matchesPeriod = recordDate >= weekAgo; 
        } else if (filterPeriod === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(today.getMonth() - 1);
            matchesPeriod = recordDate >= monthAgo;
        } else if (filterPeriod === 'year') {
             const yearAgo = new Date();
             yearAgo.setFullYear(today.getFullYear() - 1);
             matchesPeriod = recordDate >= yearAgo;
        }
        return matchesSearch && matchesPeriod;
    });

    const exportCSV = () => {
        const headers = ["Data", "Fornecedor", "Produto", "Lote", "Validade", "Peso Nota", "Peso Bruto", "Tara", "Liquido", "Diferenca", "Status"];
        const rows = filteredRecords.map(r => [new Date(r.timestamp).toLocaleDateString(), r.supplier, r.product, r.batch || '', r.expirationDate || '', r.noteWeight, r.grossWeight, r.taraTotal || 0, r.netWeight, (r.netWeight - r.noteWeight).toFixed(2), r.status]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `conferente_data_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        trackEvent('export_csv', { count: filteredRecords.length });
    };

    return (
        <div className="min-h-screen font-sans relative overflow-x-hidden selection:bg-primary-500/30 selection:text-primary-900">
            <InstallManager />
            <AnalyticsDashboard isOpen={showStats} onClose={() => setShowStats(false)} />
            {viewImage && <FullScreenImageModal src={viewImage} onClose={() => setViewImage(null)} />}

            {/* HEADER */}
            <header className="fixed top-0 w-full z-40 glass transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">C</div>
                         <div>
                             <h1 className="font-bold text-zinc-900 dark:text-white leading-none tracking-tight text-lg">Conferente</h1>
                             <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Pro Assistant</p>
                         </div>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/50">
                        <button onClick={() => setActiveTab('weigh')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'weigh' ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Conferencia</button>
                        <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Histórico</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMenuOpen(true)} className="flex items-center gap-3 group">
                            <div className="text-right hidden md:block">
                                <p className="text-xs font-bold text-zinc-800 dark:text-white group-hover:text-primary-600 transition-colors">{userProfile.name}</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{userProfile.role}</p>
                            </div>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden ring-2 ring-white dark:ring-zinc-700 shadow-md transition-transform group-hover:scale-105">
                                    {userProfile.photo ? <img src={userProfile.photo} alt="Profile" className="w-full h-full object-cover" /> : <span className="material-icons-round text-zinc-400 w-full h-full flex items-center justify-center text-lg">person</span>}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* REDESIGNED SIDE MENU (Z-100 to overlay dynamic island) */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-y-auto animate-slide-left border-l border-zinc-100 dark:border-zinc-800 flex flex-col">
                        
                        {/* Menu Header */}
                        <div className="p-6 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/50">
                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <span className="material-icons-round text-zinc-400">tune</span>
                                Ajustes
                            </h2>
                            <button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                <span className="material-icons-round dark:text-white">close</span>
                            </button>
                        </div>

                        <div className="p-6 flex-1 flex flex-col gap-6">
                            
                            {/* Profile Card */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-white dark:bg-zinc-800 overflow-hidden relative group border-4 border-white dark:border-zinc-700 shadow-lg mb-4">
                                    {userProfile.photo ? <img src={userProfile.photo} alt="User" className="w-full h-full object-cover" /> : <span className="material-icons-round text-4xl text-zinc-300 w-full h-full flex items-center justify-center">person</span>}
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <span className="material-icons-round text-white">edit</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = ev => setUserProfileState(p => ({ ...p, photo: ev.target?.result as string })); reader.readAsDataURL(file); } }} />
                                    </label>
                                </div>
                                <div className="space-y-3 w-full">
                                    <input type="text" value={userProfile.name} onChange={e => setUserProfileState(p => ({...p, name: e.target.value}))} className="w-full bg-transparent text-center font-bold text-lg dark:text-white outline-none border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-primary-500 pb-1" placeholder={t('ph_name')} />
                                    <input type="text" value={userProfile.role} onChange={e => setUserProfileState(p => ({...p, role: e.target.value}))} className="w-full bg-transparent text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 outline-none border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-primary-500 pb-1" placeholder={t('ph_role')} />
                                    <input type="text" value={userProfile.store || ''} onChange={e => setUserProfileState(p => ({...p, store: e.target.value}))} className="w-full bg-transparent text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 outline-none border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-primary-500 pb-1" placeholder={t('ph_store')} />
                                </div>
                            </div>

                            {/* Settings Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setShowStats(true); setIsMenuOpen(false); }} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <span className="material-icons-round text-2xl text-blue-500 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">analytics</span>
                                    <span className="text-xs font-bold dark:text-white">Estadísticas</span>
                                </button>
                                <button onClick={toggleTheme} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <span className="material-icons-round text-2xl text-purple-500 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                                    <span className="text-xs font-bold dark:text-white">{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                                </button>
                                
                                {isNotificationSupported() && (
                                    <button onClick={handleEnableNotifications} className="col-span-2 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`material-icons-round text-2xl p-2 rounded-xl ${notificationStatus === 'granted' ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' : 'text-zinc-400 bg-zinc-200 dark:bg-zinc-700'}`}>
                                                {notificationStatus === 'granted' ? 'notifications_active' : 'notifications_off'}
                                            </span>
                                            <div className="text-left">
                                                <span className="text-xs font-bold dark:text-white block">Notificaciones</span>
                                                <span className="text-[10px] text-zinc-500">{notificationStatus === 'granted' ? 'Activadas' : 'Desactivadas'}</span>
                                            </div>
                                        </div>
                                        {notificationStatus !== 'granted' && <span className="text-xs font-bold text-primary-500">Activar</span>}
                                    </button>
                                )}
                            </div>

                            {/* Language */}
                            <div>
                                <label className="text-xs font-black text-zinc-400 uppercase mb-3 block tracking-widest pl-1">Idioma</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['pt', 'es', 'en'] as const).map(lang => (
                                        <button key={lang} type="button" onClick={() => setLanguage(lang)} className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border ${language === lang ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}>{lang}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Save Action - Added Padding bottom to clear standard navigation areas, though z-index handles overlap */}
                        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md pb-10">
                            <button onClick={handleProfileSave} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                <span className="material-icons-round">save</span>
                                {t('btn_save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="pt-24 pb-32 px-4 w-full">
                <div className="max-w-xl mx-auto">
                    {/* 
                        MODIFIED: Use CSS visibility (display: none/block) instead of conditional rendering (&&)
                        This ensures the component stays mounted and preserves its state when switching tabs.
                    */}
                    <div className="animate-fade-in" style={{ display: activeTab === 'weigh' ? 'block' : 'none' }}>
                        <WeighingForm ref={weighingFormRef} />
                    </div>
                    
                    <div className="animate-fade-in" style={{ display: activeTab === 'history' ? 'block' : 'none' }}>
                        <div className="sticky top-20 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-subtle p-4 mb-6 space-y-3">
                                 <div className="relative group">
                                    <span className="material-icons-round absolute left-4 top-3 text-zinc-400 text-xl group-focus-within:text-primary-500 transition-colors">search</span>
                                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('ph_search')} className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl outline-none dark:text-white font-medium text-sm focus:bg-white dark:focus:bg-zinc-700 border-0 focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-zinc-400" />
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                                    {[
                                        { id: 'all', label: t('filter_all') },
                                        { id: 'today', label: t('filter_today') },
                                        { id: 'week', label: t('filter_week') },
                                        { id: 'month', label: t('filter_month') },
                                        { id: 'year', label: t('filter_year') }
                                    ].map(f => (
                                        <button key={f.id} onClick={() => setFilterPeriod(f.id as any)} className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${filterPeriod === f.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}>{f.label}</button>
                                    ))}
                                    <div className="flex-1"></div>
                                    <button onClick={exportCSV} className="w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-500 transition-colors shadow-sm"><span className="material-icons-round text-sm">download</span></button>
                                </div>
                            </div>
                            {filteredRecords.length === 0 ? (
                                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-5"><span className="material-icons-round text-5xl text-zinc-300 dark:text-zinc-600">history</span></div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{t('hist_empty')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRecords.map(record => <HistoryItem key={record.id} record={record} onDelete={handleDeleteRecord} onShare={handleShare} onViewImage={setViewImage} />)}
                                </div>
                            )}
                             {records.length > 0 && (
                                <div className="mt-10 text-center">
                                    <button onClick={() => { if(confirm(t('msg_confirm_delete_all'))) { clearAllRecords(); setRecords([]); } }} className="text-red-400 hover:text-red-600 text-xs font-bold opacity-70 hover:opacity-100 transition-opacity uppercase tracking-widest px-6 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl">{t('btn_delete_all_history')}</button>
                                </div>
                            )}
                    </div>
                </div>
            </main>

            {/* DYNAMIC NAVIGATION ISLAND (Z-50) */}
            <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full shadow-2xl shadow-primary-900/10 p-1.5 flex items-center gap-1.5 z-50 max-w-[92%] overflow-x-auto no-scrollbar transition-all duration-300 ring-1 ring-black/5">
                {/* Tab Buttons: h-12, px-5 */}
                <button onClick={() => { setActiveTab('weigh'); trackEvent('nav_click', { tab: 'weigh' }); }} className={`h-12 px-5 rounded-full flex items-center justify-center gap-2 transition-all duration-300 shrink-0 ${activeTab === 'weigh' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <span className="material-icons-round text-xl">scale</span>
                    {activeTab === 'weigh' && <span className="text-xs animate-fade-in whitespace-nowrap font-bold">{t('tab_weigh')}</span>}
                </button>
                
                <button onClick={() => { setActiveTab('history'); trackEvent('nav_click', { tab: 'history' }); }} className={`h-12 px-5 rounded-full flex items-center justify-center gap-2 transition-all duration-300 shrink-0 ${activeTab === 'history' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <span className="material-icons-round text-xl">history</span>
                     {activeTab === 'history' && <span className="text-xs animate-fade-in whitespace-nowrap font-bold">{t('tab_history')}</span>}
                </button>

                {activeTab === 'weigh' && (
                    <>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0"></div>
                        
                        <div className="flex items-center gap-1.5 animate-slide-left pr-0.5">
                             <button onClick={() => weighingFormRef.current?.openCamera()} className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center shrink-0">
                                <span className="material-icons-round text-xl">photo_camera</span>
                            </button>
                             <button onClick={() => weighingFormRef.current?.openGallery()} className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center shrink-0">
                                <span className="material-icons-round text-xl">collections</span>
                            </button>
                            
                            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0"></div>
                            
                            <button onClick={() => weighingFormRef.current?.clear()} className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0">
                                <span className="material-icons-round text-xl">delete_outline</span>
                            </button>
                            
                            <button onClick={() => weighingFormRef.current?.save()} className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0">
                                <span className="material-icons-round text-xl">save</span>
                            </button>
                        </div>
                    </>
                )}
            </nav>
            <InstallPrompt className="fixed bottom-24 left-4 right-4 z-40 md:left-auto md:right-4 md:w-80 md:bottom-4" />
        </div>
    );
};

export default () => (
    <LanguageProvider>
        <ToastProvider>
            <App />
        </ToastProvider>
    </LanguageProvider>
);