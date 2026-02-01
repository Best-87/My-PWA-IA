
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InstallManager } from './components/InstallManager';
import { WeighingForm, WeighingFormHandle } from './components/WeighingForm';
import { BottomNav } from './components/BottomNav';
import { ModernRecordCard } from './components/ModernRecordCard';
import { ProfileView } from './components/ProfileView';
import { getRecords, deleteRecord, clearAllRecords, getUserProfile, saveUserProfile, getTheme, saveTheme, generateBackupData, restoreBackupData, syncRecords } from './services/storageService';
import { WeighingRecord, UserProfile } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { ToastProvider, useToast } from './components/Toast';
import { trackEvent } from './services/analyticsService';
import { ChatInterface } from './components/ChatInterface';
import { isSupabaseConfigured, signIn, signUp, signOut, onAuthStateChange, fetchRecordsFromSupabase } from './services/supabaseService';
import { SplashScreen } from './components/SplashScreen';

// APP CONFIGURATION
const APP_VERSION = '1.0.1';
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
    today.setHours(0, 0, 0, 0);

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
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'weigh' | 'history' | 'profile'>('weigh');
    const [records, setRecords] = useState<WeighingRecord[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [profile, setProfile] = useState<UserProfile>(getUserProfile());
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [theme, setThemeState] = useState(getTheme());

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

    // Image Viewer State
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [hasUnsavedWeighingData, setHasUnsavedWeighingData] = useState(false);

    // Auth & Session State
    const [session, setSession] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthModeLogin, setIsAuthModeLogin] = useState(true);
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const backupInputRef = useRef<HTMLInputElement>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);

    const formRef = useRef<WeighingFormHandle>(null);

    // Delete Modal State
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);

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

        // Listen for online/offline status changes
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for SW updates
        const handleSWUpdate = () => setShowUpdate(true);
        window.addEventListener('sw-update', handleSWUpdate);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sw-update', handleSWUpdate);
        };
    }, []);

    // Screen Wake Lock
    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('Screen Wake Lock is active');
                } catch (err) {
                    console.warn('Wake Lock request failed:', err);
                }
            }
        };

        requestWakeLock();

        const handleVisibilityChange = async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock !== null) {
                wakeLock.release().catch((e: any) => console.error(e));
                wakeLock = null;
            }
        };
    }, []);

    // Initialize Session & Auth
    useEffect(() => {
        onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                // If logged in, update profile email
                setProfile(prev => ({ ...prev, email: session.user.email }));
                // Force record refresh from Supabase and sync to local automatically
                fetchRecordsFromSupabase().then(cloudRecords => {
                    if (cloudRecords.length > 0) {
                        setRecords(cloudRecords);
                        syncRecords(cloudRecords); // AUTO DOWNLOAD/SYNC
                    }
                });
            }
        });
    }, []);

    const handleFinishLoading = useCallback(() => {
        setIsLoading(false);
    }, []);

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

    const handleTabChange = (tab: 'weigh' | 'history' | 'profile') => {
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
        setRecordToDelete(id);
    };

    const confirmDelete = () => {
        if (recordToDelete) {
            deleteRecord(recordToDelete);
            setRecords(getRecords());
            showToast(t('msg_history_cleared'), 'info');
            setRecordToDelete(null);
        }
    };

    const handleClearAll = () => {
        if (records.length > 0) {
            setShowDeleteAllModal(true);
        }
    };

    const executeClearAll = () => {
        clearAllRecords();
        setRecords([]);
        setShowDeleteAllModal(false);
        showToast(t('msg_history_cleared'), 'warning');
        trackEvent('history_cleared');
    };

    const handleSaveProfile = () => {
        saveUserProfile(profile);
        setShowProfileModal(false);
        showToast(t('msg_profile_saved'), 'success');
        trackEvent('profile_updated');
    };

    const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setProfile(prev => ({ ...prev, photo: result }));
            };
            reader.readAsDataURL(file);
        }
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

    const handleBackup = () => {
        try {
            const data = generateBackupData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `conferente_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            trackEvent('backup_created');
            showToast(t('msg_backup_success') || "Copia de seguridad creada", 'success');
        } catch (e) {
            showToast("Error al crear backup", 'error');
        }
    };

    const handleShareWhatsapp = (rec: WeighingRecord, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const diff = rec.netWeight - rec.noteWeight;
        const isSurplus = diff >= 0;

        const text = `*${t('rpt_title')}*
---------------------------
${t('rpt_supplier')} ${rec.supplier}
${t('rpt_product')} ${rec.product}
${rec.batch ? `${t('rpt_batch')} ${rec.batch}` : ''}
${rec.expirationDate ? `${t('rpt_expiration')} ${rec.expirationDate}` : ''}
---------------------------
${t('rpt_gross')} ${rec.grossWeight.toFixed(3)} kg
${t('rpt_tara')} ${rec.taraTotal.toFixed(3)} kg (x${rec.boxes.qty})
${t('rpt_net')} *${rec.netWeight.toFixed(3)} kg*
---------------------------
${t('rpt_diff')} *${isSurplus ? '+' : ''}${diff.toFixed(3)} kg*
${t('rpt_status')} ${Math.abs(diff) > TOLERANCE_KG ? '⚠️ ' + t('rpt_review') : '✅ ' + t('rpt_valid')}

${rec.aiAnalysis ? `${t('rpt_ai_obs')} ${rec.aiAnalysis}` : ''}
`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        trackEvent('share_whatsapp');
    };

    // --- BACKUP HANDLERS ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setIsAuthLoading(true);
        try {
            const { error } = await signIn(email, password);
            if (error) throw error;
            showToast("Login realizado com sucesso", "success");
            setEmail('');
            setPassword('');
        } catch (err: any) {
            showToast(t('msg_auth_error'), "error");
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !profile.name) return;
        setIsAuthLoading(true);
        try {
            const { error } = await signUp(email, password, {
                name: profile.name,
                role: profile.role,
                store: profile.store
            });
            if (error) throw error;
            showToast(t('msg_account_created'), "success");
            setIsAuthModeLogin(true);
        } catch (err: any) {
            showToast(err.message || t('msg_auth_error'), "error");
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        setSession(null);
        showToast("Sesión cerrada", "info");
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

    // Filter logic
    const filteredRecords = records.filter(rec => {
        // Search Filter
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || (
            rec.supplier.toLowerCase().includes(lowerSearch) ||
            rec.product.toLowerCase().includes(lowerSearch) ||
            (rec.batch && rec.batch.toLowerCase().includes(lowerSearch))
        );

        // Time Filter
        const recDate = new Date(rec.timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let matchesTime = true;
        if (timeFilter === 'today') {
            matchesTime = recDate.toDateString() === today.toDateString();
        } else if (timeFilter === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);
            matchesTime = recDate >= lastWeek;
        } else if (timeFilter === 'month') {
            const lastMonth = new Date();
            lastMonth.setMonth(today.getMonth() - 1);
            matchesTime = recDate >= lastMonth;
        } else if (timeFilter === 'year') {
            const lastYear = new Date();
            lastYear.setFullYear(today.getFullYear() - 1);
            matchesTime = recDate >= lastYear;
        }

        return matchesSearch && matchesTime;
    });

    return (
        <>
            {isLoading && <SplashScreen onFinish={handleFinishLoading} version={APP_VERSION} />}

            <div className={`min-h-screen bg-[#F0F4F9] dark:bg-black pb-20 font-sans selection:bg-blue-500/30 ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-700'}`}>
                {/* Visual Background Elements from Image */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[10%] right-[-10%] w-[80%] h-[40%] bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-[20%] left-[-10%] w-[70%] h-[50%] bg-purple-200/20 dark:bg-purple-900/10 blur-[120px] rounded-full"></div>
                    <div className="absolute top-[30%] left-[20%] w-2 h-2 bg-white rounded-full blur-[1px] opacity-40 shadow-[0_0_10px_white]"></div>
                    <div className="absolute top-[60%] right-[30%] w-1.5 h-1.5 bg-white rounded-full blur-[1px] opacity-30 shadow-[0_0_8px_white]"></div>
                </div>

                <InstallManager />
                <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
                <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />

                {/* Adaptive Minimal Top Bar - Refined per image */}
                <header className="fixed top-0 left-0 right-0 h-14 bg-white/40 dark:bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center z-[100]">
                    <h1 className="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tighter uppercase opacity-80">{t('app_name')}</h1>
                    <div className="mt-1 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/60 dark:bg-white/10 shadow-sm border border-white/40 dark:border-white/5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </header>

                {/* Main Content */}
                <main className={`relative z-[10] pt-20 px-4 pb-32 max-w-lg mx-auto ${isLoading ? 'transform translate-y-4 opacity-0 transition-all duration-700' : 'opacity-100 transition-opacity duration-700'}`}>
                    {activeTab === 'weigh' && (
                        <div className="animate-fade-in">
                            <WeighingForm
                                ref={formRef}
                                onViewHistory={() => handleTabChange('history')}
                                onDataChange={setHasUnsavedWeighingData}
                                onRecordSaved={() => setRecords(getRecords())}
                            />
                        </div>
                    )}
                    {
                        activeTab === 'history' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex items-center justify-between px-2 mt-4 mb-6">
                                    <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{t('hist_recent')}</h2>
                                    <div className="flex gap-2">
                                        <button onClick={handleExportCSV} title="Exportar CSV" className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-200 dark:border-white/10">
                                            <span className="material-icons-round text-xl">download</span>
                                        </button>
                                        <button onClick={handleBackup} title="Descargar Backup" className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-200 dark:border-white/10">
                                            <span className="material-icons-round text-xl">save_alt</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Floating Filter & Search Card */}
                                <div className="smart-card p-4 space-y-4 smart-shadow">
                                    {/* Time Filters */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                        {[
                                            { id: 'all', label: t('filter_all') },
                                            { id: 'today', label: t('filter_today') },
                                            { id: 'week', label: t('filter_week') },
                                            { id: 'month', label: t('filter_month') },
                                            { id: 'year', label: t('filter_year') }
                                        ].map(filter => (
                                            <button
                                                key={filter.id}
                                                onClick={() => setTimeFilter(filter.id as any)}
                                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${timeFilter === filter.id
                                                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-white/5'
                                                    }`}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="material-icons-round text-zinc-400 group-focus-within:text-blue-500 transition-colors">search</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={t('ph_search')}
                                            className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none shadow-sm border border-transparent focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold placeholder:text-zinc-300"
                                        />
                                    </div>
                                </div>

                                {records.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <span className="material-icons-round text-6xl text-zinc-300 dark:text-zinc-700 mb-4">history_toggle_off</span>
                                        <p className="text-zinc-500 dark:text-zinc-400">{t('hist_empty')}</p>
                                    </div>
                                ) : filteredRecords.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                                        No se encontraron resultados.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {(() => {
                                            const grouped = filteredRecords.reduce((acc, rec) => {
                                                const date = new Date(rec.timestamp);
                                                const today = new Date();
                                                const yesterday = new Date(today);
                                                yesterday.setDate(yesterday.getDate() - 1);

                                                let key = date.toLocaleDateString();
                                                if (date.toDateString() === today.toDateString()) key = "Hoy";
                                                else if (date.toDateString() === yesterday.toDateString()) key = "Ayer";

                                                if (!acc[key]) acc[key] = [];
                                                acc[key].push(rec);
                                                return acc;
                                            }, {} as Record<string, WeighingRecord[]>);

                                            return Object.entries(grouped).map(([dateLabel, groupRecords]) => (
                                                <div key={dateLabel} className="animate-slide-up-fade">
                                                    <h3 className="sticky top-0 bg-[#F0F4F9]/80 dark:bg-black/80 backdrop-blur-xl py-3 px-2 z-10 text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2">
                                                        {dateLabel}
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {groupRecords.map((rec) => (
                                                            <ModernRecordCard
                                                                key={rec.id}
                                                                record={rec}
                                                                isExpanded={expandedIds.has(rec.id)}
                                                                onExpand={() => toggleExpand(rec.id)}
                                                                onDelete={(e) => handleDelete(rec.id, e)}
                                                                onShare={(e) => handleShareWhatsapp(rec, e)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}


                            </div>
                        )
                    }
                    {
                        activeTab === 'profile' && (
                            <ProfileView
                                profile={profile}
                                session={session}
                                email={email}
                                isAuthLoading={isAuthLoading}
                                onSaveProfile={() => {
                                    saveUserProfile(profile);
                                    showToast(t('profile_saved') || 'Guardado', 'success');
                                }}
                                onSignOut={handleSignOut}
                                onPhotoUpload={handleProfilePhotoUpload}
                                onThemeChange={() => {
                                    const newTheme = theme === 'dark' ? 'light' : 'dark';
                                    setThemeState(newTheme);
                                    saveTheme(newTheme);
                                    if (newTheme === 'dark') {
                                        document.documentElement.classList.add('dark');
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                    }
                                }}
                                theme={theme}
                                onLanguageChange={setLanguage}
                                currentLanguage={language}
                                onProfileChange={(field, value) => setProfile(prev => ({ ...prev, [field]: value }))}
                                version={APP_VERSION}
                                onBackup={() => {
                                    const data = generateBackupData();
                                    const blob = new Blob([data], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `conferente_backup_${new Date().toISOString().split('T')[0]}.json`;
                                    a.click();
                                    showToast("Backup local descargado", "success");
                                }}
                                onRestore={() => backupInputRef.current?.click()}

                                // Auth Props
                                password={password}
                                onPasswordChange={setPassword}
                                onLogin={handleLogin}
                                onSignup={handleSignup}
                                isAuthModeLogin={isAuthModeLogin}
                                onToggleAuthMode={() => setIsAuthModeLogin(!isAuthModeLogin)}
                                onEmailChange={setEmail}
                            />
                        )
                    }
                </main >

                {/* Image Viewer Modal */}
                {
                    viewImage && (
                        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewImage(null)}>
                            <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                                <img src={viewImage} alt="Evidencia Full" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                                <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                                    <span className="material-icons-round text-2xl">close</span>
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Delete Confirmation Modal (Single Record) */}
                {
                    recordToDelete && (
                        <div
                            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="modal-delete-title"
                            onClick={() => setRecordToDelete(null)}
                        >
                            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-slide-up ring-1 ring-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[60px] pointer-events-none"></div>
                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="relative mb-5">
                                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full"></div>
                                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center relative shadow-sm border border-red-100 dark:border-red-900/30">
                                            <span className="material-icons-round text-3xl text-red-500">delete_forever</span>
                                        </div>
                                    </div>
                                    <h3 id="modal-delete-title" className="text-xl font-black text-zinc-900 dark:text-white mb-2 leading-tight">{t('msg_confirm_delete')}</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed px-4">Esta acción no se puede deshacer. El registro será eliminado permanentemente.</p>
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <button onClick={() => setRecordToDelete(null)} className="py-3.5 rounded-xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">{t('btn_not_now')}</button>
                                        <button onClick={confirmDelete} className="py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">{t('btn_erase')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Delete All Confirmation Modal */}
                {
                    showDeleteAllModal && (
                        <div
                            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="modal-delete-all-title"
                            onClick={() => setShowDeleteAllModal(false)}
                        >
                            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-slide-up ring-1 ring-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[60px] pointer-events-none"></div>
                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="relative mb-5">
                                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full"></div>
                                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center relative shadow-sm border border-red-100 dark:border-red-900/30">
                                            <span className="material-icons-round text-3xl text-red-500">delete_sweep</span>
                                        </div>
                                    </div>
                                    <h3 id="modal-delete-all-title" className="text-xl font-black text-zinc-900 dark:text-white mb-2 leading-tight">{t('msg_confirm_delete_all')}</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed px-4">Esta acción es irreversible. Se eliminarán todos los registros guardados localmente.</p>
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <button onClick={() => setShowDeleteAllModal(false)} className="py-3.5 rounded-xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">{t('btn_not_now')}</button>
                                        <button onClick={executeClearAll} className="py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">{t('btn_delete_all_history')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }



                {/* Chat Modal */}
                {
                    showChat && (
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
                    )
                }


            </div >

            {/* ELEMENTS OUTSIDE MAIN CONTAINER TO ENSURE FIXED POSITIONING WORKS CORRECTLY */}

            {/* Update Notification Banner */}
            {showUpdate && (
                <div className="fixed bottom-24 left-4 right-4 z-[100] animate-slide-up">
                    <div className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-black p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                <span className="material-icons-round text-blue-400 dark:text-blue-600 animate-pulse">system_update</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm leading-tight">{t('update_available')}</h4>
                                <p className="text-xs text-zinc-400 dark:text-zinc-600">Nueva versión lista.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wide rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            {t('btn_update')}
                        </button>
                    </div>
                </div>
            )}

            {/* Modern Bottom Navigation */}
            <BottomNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                profilePhoto={profile.photo}
            />

            {/* DEV ONLY: Hidden trigger to test update UI - triple click bottom right corner if needed */}
            {import.meta.env.DEV && (
                <div
                    className="fixed bottom-0 right-0 w-10 h-10 z-[200]"
                    onClick={(e) => { if (e.detail === 3) setShowUpdate(true); }}
                />
            )}
        </>
    );
};

export default AppContent;
