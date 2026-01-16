import React, { useState, useEffect, useRef } from 'react';
import { InstallManager } from './components/InstallManager';
import { WeighingForm, WeighingFormHandle } from './components/WeighingForm';
import { getRecords, deleteRecord, clearAllRecords, getUserProfile, saveUserProfile, getTheme, saveTheme, generateBackupData, restoreBackupData } from './services/storageService';
import { WeighingRecord, UserProfile } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { ToastProvider, useToast } from './components/Toast';
import { InstallPrompt } from './components/InstallPrompt';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { initAnalytics, trackEvent } from './services/analyticsService';
import { ChatInterface } from './components/ChatInterface';
import { initGoogleDrive, uploadBackupToDrive, restoreBackupFromDrive } from './services/googleDriveService';

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
    
    const expDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `VENCIDO (${Math.abs(diffDays)}d)`;
    if (diffDays <= 3) return `CRÍTICO (${diffDays}d)`;
    if (diffDays <= 7) return `ALERTA (${diffDays}d)`;
    return null;
};

// Internal Component using Hooks
const AppContent = () => {
    const { t, language, setLanguage } = useTranslation();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'weigh' | 'history'>('weigh');
    const [records, setRecords] = useState<WeighingRecord[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [profile, setProfile] = useState<UserProfile>(getUserProfile());
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [theme, setThemeState] = useState(getTheme());
    
    // Image Viewer State
    const [viewImage, setViewImage] = useState<string | null>(null);

    // Backup State
    const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('google_client_id') || '');
    const [isDriveSyncing, setIsDriveSyncing] = useState(false);
    const backupInputRef = useRef<HTMLInputElement>(null);
    
    const formRef = useRef<WeighingFormHandle>(null);

    // Initial Load
    useEffect(() => {
        setRecords(getRecords());
        const savedTheme = getTheme();
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Listen for updates via focus
        const handleFocus = () => setRecords(getRecords());
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // Initialize Drive if client ID exists
    useEffect(() => {
        if (googleClientId) {
            initGoogleDrive(googleClientId, (success) => {
                if(success) console.log("Google Drive Initialized");
            });
        }
    }, [googleClientId]);

    // Theme Toggle
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setThemeState(newTheme);
        saveTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        trackEvent('theme_changed', { theme: newTheme });
    };

    const handleTabChange = (tab: 'weigh' | 'history') => {
        setActiveTab(tab);
        if (tab === 'history') {
            setRecords(getRecords());
        }
        trackEvent('tab_changed', { tab });
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (confirm(t('msg_confirm_delete'))) {
            deleteRecord(id);
            setRecords(getRecords());
            showToast(t('msg_history_cleared'), 'info');
        }
    };

    const handleClearAll = () => {
        if (confirm(t('msg_confirm_delete_all'))) {
            clearAllRecords();
            setRecords([]);
            showToast(t('msg_history_cleared'), 'warning');
            trackEvent('history_cleared');
        }
    };
    
    const handleSaveProfile = () => {
        saveUserProfile(profile);
        setShowProfileModal(false);
        showToast(t('msg_profile_saved'), 'success');
        trackEvent('profile_updated');
    };

    const handleExportCSV = () => {
        if (records.length === 0) return;
        const headers = ['Data', 'Fornecedor', 'Produto', 'Lote', 'Validade', 'Peso Nota', 'Peso Bruto', 'Tara Total', 'Peso Liquido', 'Diferenca', 'Status'];
        const rows = records.map(r => [
            new Date(r.timestamp).toLocaleString(),
            r.supplier,
            r.product,
            r.batch || '',
            r.expirationDate || '',
            r.noteWeight.toFixed(3),
            r.grossWeight.toFixed(3),
            r.taraTotal.toFixed(3),
            r.netWeight.toFixed(3),
            (r.netWeight - r.noteWeight).toFixed(3),
            r.status
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `conferente_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        trackEvent('data_exported', { count: records.length });
    };

    // --- BACKUP HANDLERS ---
    const handleSaveClientId = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setGoogleClientId(val);
        localStorage.setItem('google_client_id', val);
    };

    const handleDriveUpload = async () => {
        if (!googleClientId) {
            showToast("Ingresa tu Google Client ID", 'warning');
            return;
        }
        setIsDriveSyncing(true);
        try {
            const data = generateBackupData();
            initGoogleDrive(googleClientId, async (success) => {
                if(success) {
                    await uploadBackupToDrive(data);
                    showToast(t('backup_success'), 'success');
                    trackEvent('drive_upload_success');
                } else {
                    showToast("Error inicializando Google API", 'error');
                }
                setIsDriveSyncing(false);
            });
        } catch (e) {
            console.error(e);
            showToast("Error subiendo a Drive", 'error');
            setIsDriveSyncing(false);
        }
    };

    const handleDriveRestore = async () => {
        if (!googleClientId) {
             showToast("Ingresa tu Google Client ID", 'warning');
             return;
        }
        setIsDriveSyncing(true);
        try {
            initGoogleDrive(googleClientId, async (success) => {
                if(success) {
                    const content = await restoreBackupFromDrive();
                    if (content) {
                        restoreBackupData(content);
                        showToast(t('restore_success'), 'success');
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        showToast(t('restore_not_found'), 'warning');
                    }
                }
                setIsDriveSyncing(false);
            });
        } catch (e) {
             console.error(e);
             showToast("Error restaurando de Drive", 'error');
             setIsDriveSyncing(false);
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content && restoreBackupData(content)) {
                showToast(t('restore_success'), 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast("Archivo inválido o corrupto", 'error');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] dark:bg-black transition-colors duration-300 pb-20 font-sans selection:bg-primary-500/30">
            <InstallManager />
            <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
            
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-colors">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-primary-500 to-primary-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <span className="material-icons-round text-white text-lg">scale</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-none tracking-tight">{t('app_name')}</h1>
                            <span className="text-[10px] font-bold text-primary-500 dark:text-primary-400 tracking-widest uppercase">{t('app_subtitle')}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowAnalytics(true)} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <span className="material-icons-round text-lg">bar_chart</span>
                        </button>
                         <button onClick={() => setShowProfileModal(true)} className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm relative">
                            {profile.photo ? (
                                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    <span className="material-icons-round text-lg">person</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto pt-24 px-4">
                {activeTab === 'weigh' ? (
                    <div className="animate-fade-in">
                        <div className="mb-6 flex items-center justify-between">
                             <div className="flex flex-col">
                                 <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('lbl_weighing')}</h2>
                                 <p className="text-sm text-zinc-500 dark:text-zinc-400">Nova conferência</p>
                             </div>
                        </div>
                        
                        <WeighingForm ref={formRef} onViewHistory={() => handleTabChange('history')} />
                    </div>
                ) : (
                    <div className="animate-fade-in pb-24">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('hist_recent')}</h2>
                            <div className="flex gap-2">
                                <button onClick={handleExportCSV} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    <span className="material-icons-round">download</span>
                                </button>
                                <button onClick={handleClearAll} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                                    <span className="material-icons-round">delete_sweep</span>
                                </button>
                            </div>
                        </div>

                        {records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <span className="material-icons-round text-6xl text-zinc-300 dark:text-zinc-700 mb-4">history_toggle_off</span>
                                <p className="text-zinc-500 dark:text-zinc-400">{t('hist_empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {records.map((rec) => {
                                    const diff = rec.netWeight - rec.noteWeight;
                                    const isError = Math.abs(diff) > TOLERANCE_KG;
                                    const risk = checkExpirationRisk(rec.expirationDate);
                                    const isExpanded = expandedIds.has(rec.id);
                                    
                                    return (
                                        <div key={rec.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300">
                                            {/* Main Clickable Header */}
                                            <div onClick={() => toggleExpand(rec.id)} className="p-5 relative cursor-pointer select-none">
                                                {/* Status Bar */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                                
                                                <div className="pl-3 flex justify-between items-start">
                                                    {/* Left: Info */}
                                                    <div>
                                                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{rec.product}</h3>
                                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mt-0.5">{rec.supplier}</p>
                                                    </div>
                                                    
                                                    {/* Right: Toggle Icon & Time */}
                                                    <div className="flex flex-col items-end gap-1">
                                                         <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                            {new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        <span className={`material-icons-round text-zinc-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                                    </div>
                                                </div>

                                                {/* GRID: 6 Metrics for Unexpanded View */}
                                                <div className="pl-3 mt-4 grid grid-cols-3 gap-y-3 gap-x-2">
                                                    {/* 1. Gross */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 uppercase font-black truncate">{t('lbl_gross_weight')}</span>
                                                        <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">{rec.grossWeight.toFixed(3)}</span>
                                                    </div>
                                                    {/* 2. Note */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 uppercase font-black truncate">{t('lbl_note_weight')}</span>
                                                        <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">{rec.noteWeight.toFixed(3)}</span>
                                                    </div>
                                                    {/* 3. Net (Liquid) */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 uppercase font-black truncate">{t('hist_liquid')}</span>
                                                        <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">{rec.netWeight.toFixed(3)}</span>
                                                    </div>
                                                    {/* 4. Tara */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 uppercase font-black truncate">Tara</span>
                                                        <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">{rec.taraTotal.toFixed(3)}</span>
                                                    </div>
                                                    {/* 5. Boxes */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 uppercase font-black truncate">{t('lbl_qty')}</span>
                                                        <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">{rec.boxes.qty}</span>
                                                    </div>
                                                    {/* 6. Diff */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 uppercase font-black truncate">{t('hist_diff')}</span>
                                                        <span className={`font-mono text-sm font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Collapsed indicators (below grid if present) */}
                                                {!isExpanded && (risk || rec.aiAnalysis || rec.evidence) && (
                                                    <div className="pl-3 mt-3 flex items-center gap-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
                                                        {(risk || rec.aiAnalysis) && (
                                                            <div className="flex gap-1.5">
                                                                {risk && <span className="material-icons-round text-red-500 text-sm" title="Riesgo">warning</span>}
                                                                {rec.aiAnalysis && <span className="material-icons-round text-purple-500 text-sm" title="IA">smart_toy</span>}
                                                            </div>
                                                        )}
                                                        {rec.evidence && (
                                                            <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setViewImage(rec.evidence!); }}>
                                                                <img src={rec.evidence} className="w-full h-full object-cover" alt="Thumb" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 pl-8 animate-slide-down">
                                                     {/* Expanded Details: Logistics */}
                                                     {(rec.batch || rec.productionDate || rec.expirationDate || rec.recommendedTemperature) && (
                                                        <div className="mb-6">
                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">Datos Logísticos</span>
                                                            <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                                 {rec.batch && <div><span className="text-zinc-500 block mb-0.5">Lote</span> <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{rec.batch}</span></div>}
                                                                 {rec.recommendedTemperature && <div><span className="text-zinc-500 block mb-0.5">Temp</span> <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{rec.recommendedTemperature}</span></div>}
                                                                 {rec.productionDate && <div><span className="text-zinc-500 block mb-0.5">Fabricación</span> <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{rec.productionDate}</span></div>}
                                                                 {rec.expirationDate && <div><span className="text-zinc-500 block mb-0.5">Vencimiento</span> <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{rec.expirationDate}</span></div>}
                                                            </div>
                                                        </div>
                                                     )}

                                                    {/* AI & Risk Alerts */}
                                                    <div className="space-y-3 mb-6">
                                                        {risk && (
                                                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex gap-3">
                                                                <span className="material-icons-round text-red-500">warning</span>
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-red-700 dark:text-red-300 uppercase mb-0.5">Alerta de Vencimiento</h4>
                                                                    <p className="text-xs text-red-600 dark:text-red-400">{risk}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                         {rec.aiAnalysis && (
                                                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 flex gap-3">
                                                                <span className="material-icons-round text-purple-500">smart_toy</span>
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-0.5">Análisis IA</h4>
                                                                    <p className="text-xs text-purple-600 dark:text-purple-400">{rec.aiAnalysis}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Evidence Image */}
                                                    {rec.evidence && (
                                                        <div className="mb-6">
                                                             <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">{t('lbl_evidence_section')}</span>
                                                             <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-80 bg-black/5 cursor-pointer hover:opacity-90 transition-opacity" onClick={(e) => { e.stopPropagation(); setViewImage(rec.evidence!); }}>
                                                                <img src={rec.evidence} alt="Evidencia" className="w-full h-full object-contain" />
                                                             </div>
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <button onClick={(e) => handleDelete(rec.id, e)} className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors active:scale-95 w-full justify-center sm:w-auto">
                                                            <span className="material-icons-round text-lg">delete</span>
                                                            {t('btn_erase')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Floating Action Button to Return to Weighing */}
                        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
                            <button 
                                onClick={() => handleTabChange('weigh')}
                                className="bg-[#1C1C1E] text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl ring-1 ring-white/10 hover:scale-105 transition-all animate-slide-up pointer-events-auto"
                            >
                                <span className="material-icons-round">scale</span>
                                <span className="font-bold text-sm">Volver a Pesar</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Image Viewer Modal */}
            {viewImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewImage(null)}>
                    <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                        <img src={viewImage} alt="Evidencia Full" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                        <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                            <span className="material-icons-round text-2xl">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Profile & Settings Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowProfileModal(false)}>
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{t('lbl_profile')}</h3>
                            <button onClick={toggleTheme} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                <span className="material-icons-round">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                            </button>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="flex justify-center mb-4">
                                <div className="relative group cursor-pointer" onClick={() => { /* Photo upload logic could go here */ }}>
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-800 shadow-xl">
                                        {profile.photo ? (
                                            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                                                <span className="material-icons-round text-4xl">person</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-icons-round text-white">edit</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Profile Fields */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-2 mb-1 block">{t('lbl_name')}</label>
                                    <input 
                                        type="text" 
                                        value={profile.name} 
                                        onChange={e => setProfile({...profile, name: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary-500/50"
                                        placeholder={t('ph_name')}
                                    />
                                </div>
                                 <div>
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-2 mb-1 block">{t('lbl_role')}</label>
                                    <input 
                                        type="text" 
                                        value={profile.role} 
                                        onChange={e => setProfile({...profile, role: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary-500/50"
                                        placeholder={t('ph_role')}
                                    />
                                </div>
                                 <div>
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-2 mb-1 block">{t('lbl_store')}</label>
                                    <input 
                                        type="text" 
                                        value={profile.store || ''} 
                                        onChange={e => setProfile({...profile, store: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary-500/50"
                                        placeholder={t('ph_store')}
                                    />
                                </div>
                            </div>
                            
                            {/* Language */}
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {['pt', 'es', 'en'].map((lang) => (
                                    <button 
                                        key={lang}
                                        onClick={() => setLanguage(lang as any)}
                                        className={`py-2 rounded-lg text-xs font-bold uppercase transition-colors ${language === lang ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4"></div>

                            {/* Backup Section */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                    <span className="material-icons-round text-sm">cloud_sync</span> Copia de Seguridad
                                </h4>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">{t('lbl_client_id')}</label>
                                    <input 
                                        type="text" 
                                        value={googleClientId} 
                                        onChange={handleSaveClientId} 
                                        placeholder={t('ph_client_id')} 
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs font-mono text-zinc-600 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handleDriveUpload} disabled={isDriveSyncing || !googleClientId} className="py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all active:scale-95 group disabled:opacity-50">
                                        <span className={`material-icons-round text-blue-500 ${isDriveSyncing ? 'animate-spin' : ''}`}>{isDriveSyncing ? 'sync' : 'cloud_upload'}</span>
                                        <span className="text-[9px] font-bold uppercase text-zinc-500">Backup</span>
                                    </button>
                                    <button onClick={handleDriveRestore} disabled={isDriveSyncing || !googleClientId} className="py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all active:scale-95 group disabled:opacity-50">
                                        <span className={`material-icons-round text-emerald-500 ${isDriveSyncing ? 'animate-spin' : ''}`}>{isDriveSyncing ? 'sync' : 'cloud_download'}</span>
                                        <span className="text-[9px] font-bold uppercase text-zinc-500">Restaurar</span>
                                    </button>
                                </div>
                                
                                <button onClick={() => backupInputRef.current?.click()} className="w-full py-2 bg-transparent text-zinc-400 hover:text-zinc-600 text-xs font-medium border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                                    Restaurar Archivo Local (.json)
                                </button>
                            </div>
                            
                            <button onClick={handleSaveProfile} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl mt-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                                {t('btn_save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {showChat && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowChat(false)}>
                    <div className="w-full max-w-4xl max-h-[90vh] h-[800px] animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="relative h-full">
                            <button 
                                onClick={() => setShowChat(false)} 
                                className="absolute -top-4 -right-4 z-50 w-10 h-10 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                            <ChatInterface />
                        </div>
                    </div>
                </div>
            )}

            <AnalyticsDashboard isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
            <InstallPrompt className="fixed bottom-28 left-4 right-4 z-30" />
        </div>
    );
};

// Main Export wrapping with Providers
const App = () => {
    return (
        <LanguageProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </LanguageProvider>
    );
};

export default App;