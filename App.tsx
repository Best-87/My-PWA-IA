
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InstallManager } from './components/InstallManager';
import { WeighingForm, WeighingFormHandle } from './components/WeighingForm';
import { BottomNav } from './components/BottomNav';
import { ModernRecordCard } from './components/ModernRecordCard';
import { ProfileView } from './components/ProfileView';
import { QuickWeighing } from './components/QuickWeighing';
import { getRecords, deleteRecord, clearAllRecords, getUserProfile, saveUserProfile, getTheme, saveTheme, generateBackupData, restoreBackupData, syncRecords } from './services/storageService';
import { WeighingRecord, UserProfile } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { ToastProvider, useToast } from './components/Toast';
import { trackEvent } from './services/analyticsService';
import { ChatInterface } from './components/ChatInterface';
import { isSupabaseConfigured, signIn, signUp, signOut, onAuthStateChange, fetchRecordsFromSupabase } from './services/supabaseService';
import { SplashScreen } from './components/SplashScreen';
import { V2Shell } from './components/v2/V2Shell';
import { ProfileViewV2 } from './components/v2/ProfileViewV2';

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
    const [activeTab, setActiveTab] = useState<'weigh' | 'quick' | 'history' | 'profile'>('weigh');
    const [records, setRecords] = useState<WeighingRecord[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [profile, setProfile] = useState<UserProfile>(getUserProfile());
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [theme, setThemeState] = useState(getTheme());

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>(() => {
        return (localStorage.getItem('history_time_filter') as any) || 'all';
    });
    const [useV2, setUseV2] = useState(() => localStorage.getItem('app_v2_preview') !== 'false');

    useEffect(() => {
        localStorage.setItem('app_v2_preview', useV2.toString());
    }, [useV2]);

    useEffect(() => {
        localStorage.setItem('history_time_filter', timeFilter);
    }, [timeFilter]);

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

    // Initial Theme & Online Load
    useEffect(() => {
        const savedTheme = getTheme();
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Listen for online/offline status changes
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for SW updates
        const handleSWUpdate = (e: any) => {
            console.log("Update detected in App.tsx");
            if (e.detail) {
                (window as any).swRegistration = e.detail;
            }
            setShowUpdate(true);
        };
        window.addEventListener('sw-update', handleSWUpdate);

        // Dynamic Font Injection for V2
        if (useV2) {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            localStorage.setItem('app_v2_preview', 'true');
        } else {
            localStorage.setItem('app_v2_preview', 'false');
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sw-update', handleSWUpdate);
        };
    }, [useV2]);

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

    const [isDataSyncing, setIsDataSyncing] = useState(false);

    // Initialize Session & Auth (Single Source of Truth)
    useEffect(() => {
        const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
            console.log("Auth Event:", _event, session?.user?.email);
            setSession(session);

            if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION' || _event === 'USER_UPDATED') {
                if (session?.user) {
                    setIsDataSyncing(true);
                    try {
                        const { fetchRecordsFromSupabase, fetchProfileFromSupabase } = await import('./services/supabaseService');

                        // 1. Fetch Profile
                        const cloudProfile = await fetchProfileFromSupabase();
                        if (cloudProfile) {
                            setProfile(cloudProfile);
                            // Also save locally to keep persistence
                            localStorage.setItem('conferente_profile', JSON.stringify(cloudProfile));
                        } else {
                            setProfile(prev => ({ ...prev, email: session.user.email }));
                        }

                        // 2. Fetch Records
                        const cloudRecords = await fetchRecordsFromSupabase();
                        setRecords(cloudRecords || []);
                        if (cloudRecords && cloudRecords.length > 0) {
                            syncRecords(cloudRecords);
                        }
                    } finally {
                        setIsDataSyncing(false);
                    }
                }
            } else if (_event === 'SIGNED_OUT') {
                setRecords([]);
                setProfile(getUserProfile());
                setIsDataSyncing(false);
            }
        });

        return () => subscription.unsubscribe();
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

    const handleTabChange = async (tab: 'weigh' | 'quick' | 'history' | 'profile') => {
        setActiveTab(tab);
        if (tab === 'history') {
            const updatedRecords = await getRecords();
            setRecords(updatedRecords);
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

    const confirmDelete = async () => {
        if (recordToDelete) {
            await deleteRecord(recordToDelete);
            const updatedRecords = await getRecords();
            setRecords(updatedRecords);
            showToast(t('msg_history_cleared'), 'info');
            setRecordToDelete(null);
        }
    };

    const handleApplyUpdate = () => {
        const registration = (window as any).swRegistration;
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
        }
    };

    const handleClearAll = () => {
        if (records.length > 0) {
            setShowDeleteAllModal(true);
        }
    };

    const executeClearAll = async () => {
        await clearAllRecords();
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
        try {
            // Immediate UI update
            setSession(null);
            setRecords([]);

            // Background signOut call
            await signOut();

            showToast("Sessão encerrada", "info");

            // Optional: force a page reload to clear all states and caches if issues persist
            // setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            console.error("SignOut error:", err);
            // Even if it fails, we clear state locally
            setSession(null);
            setRecords([]);
            showToast("Desconectado do sistema", "info");
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

            {useV2 ? (
                <V2Shell
                    records={records}
                    profile={profile}
                    onRecordSaved={async () => {
                        const updatedRecords = await getRecords();
                        setRecords(updatedRecords);
                    }}
                    historyContent={
                        <div className="space-y-6">
                            {records.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <p className="text-zinc-500 dark:text-zinc-400">Histórico Vazio</p>
                                </div>
                            ) : (
                                filteredRecords.map((rec) => (
                                    <ModernRecordCard
                                        key={rec.id}
                                        record={rec}
                                        isExpanded={expandedIds.has(rec.id)}
                                        onExpand={() => toggleExpand(rec.id)}
                                        onDelete={(e) => handleDelete(rec.id, e)}
                                        onShare={(e) => handleShareWhatsapp(rec, e)}
                                    />
                                ))
                            )}
                        </div>
                    }
                    profileContent={
                        <ProfileViewV2
                            profile={profile}
                            session={session}
                            email={email}
                            isAuthLoading={isAuthLoading || isDataSyncing}
                            onSaveProfile={handleSaveProfile}
                            onSignOut={handleSignOut}
                            onPhotoUpload={handleProfilePhotoUpload}
                            onThemeChange={toggleTheme}
                            theme={theme}
                            onLanguageChange={setLanguage}
                            currentLanguage={language}
                            onProfileChange={(field, value) => setProfile(prev => ({ ...prev, [field]: value }))}
                            version={APP_VERSION}
                            onBackup={handleBackup}
                            onRestore={() => backupInputRef.current?.click()}
                            password={password}
                            onPasswordChange={setPassword}
                            onLogin={handleLogin}
                            onSignup={handleSignup}
                            isAuthModeLogin={isAuthModeLogin}
                            onToggleAuthMode={() => setIsAuthModeLogin(!isAuthModeLogin)}
                            onEmailChange={setEmail}
                        />
                    }
                />
            ) : (
                <div className={`min-h-screen bg-[#F0F4F9] dark:bg-black pb-20 font-sans selection:bg-blue-500/30 ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-700'}`}>
                    <InstallManager />
                    <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />

                    <header className="fixed top-0 left-0 right-0 h-14 bg-[#F2F5F8] dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center z-[100]">
                        <h1 className="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tighter uppercase opacity-80">{t('app_name')}</h1>
                        <div className="mt-1 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                    </header>

                    <main className={`relative z-[10] pt-20 px-4 pb-32 max-w-lg mx-auto ${isLoading ? 'transform translate-y-4 opacity-0 transition-all duration-700' : 'opacity-100 transition-opacity duration-700'}`}>
                        {activeTab === 'weigh' && (
                            <div className="animate-fade-in">
                                <WeighingForm
                                    ref={formRef}
                                    onViewHistory={() => handleTabChange('history')}
                                    onDataChange={setHasUnsavedWeighingData}
                                    onRecordSaved={async () => {
                                        const updatedRecords = await getRecords();
                                        setRecords(updatedRecords);
                                    }}
                                />
                            </div>
                        )}
                        {activeTab === 'quick' && (
                            <div className="animate-fade-in">
                                <QuickWeighing />
                            </div>
                        )}
                        {activeTab === 'history' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex items-center justify-between px-2 mt-4 mb-4">
                                    <h2 className="text-xl font-bold tracking-widest text-zinc-900 dark:text-white uppercase">Historial</h2>
                                    <div className="flex gap-2">
                                        <button onClick={handleExportCSV} title="Exportar CSV" className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-300 transition-colors border-2 border-zinc-300 dark:border-zinc-700 active:bg-zinc-400">
                                            <span className="material-icons-round text-xl">download</span>
                                        </button>
                                        <button onClick={handleBackup} title="Descargar Backup" className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-300 transition-colors border-2 border-zinc-300 dark:border-zinc-700 active:bg-zinc-400">
                                            <span className="material-icons-round text-xl">save_alt</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded p-4 space-y-4 mx-1">
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {['all', 'today', 'week', 'month', 'year'].map(id => (
                                            <button
                                                key={id}
                                                onClick={() => setTimeFilter(id as any)}
                                                className={`px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest border-2 whitespace-nowrap ${timeFilter === id ? 'bg-zinc-800 text-white border-zinc-900 dark:bg-zinc-200 dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                                            >
                                                {t(`filter_${id}`)}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="BUSCAR REGISTRO..."
                                        className="w-full px-4 py-3 rounded bg-zinc-100 dark:bg-zinc-800 border-2 text-sm font-bold uppercase"
                                    />
                                </div>

                                {records.length === 0 ? (
                                    <p className="text-center py-20 text-zinc-500">{t('hist_empty')}</p>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredRecords.map(rec => (
                                            <ModernRecordCard key={rec.id} record={rec} isExpanded={expandedIds.has(rec.id)} onExpand={() => toggleExpand(rec.id)} onDelete={(e) => handleDelete(rec.id, e)} onShare={(e) => handleShareWhatsapp(rec, e)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <ProfileView
                                profile={profile}
                                session={session}
                                email={email}
                                isAuthLoading={isAuthLoading}
                                onSaveProfile={handleSaveProfile}
                                onSignOut={handleSignOut}
                                onPhotoUpload={handleProfilePhotoUpload}
                                onThemeChange={toggleTheme}
                                theme={theme}
                                onLanguageChange={setLanguage}
                                currentLanguage={language}
                                onProfileChange={(field, value) => setProfile(prev => ({ ...prev, [field]: value }))}
                                version={APP_VERSION}
                                onBackup={handleBackup}
                                onRestore={() => backupInputRef.current?.click()}
                                password={password}
                                onPasswordChange={setPassword}
                                onLogin={handleLogin}
                                onSignup={handleSignup}
                                isAuthModeLogin={isAuthModeLogin}
                                onToggleAuthMode={() => setIsAuthModeLogin(!isAuthModeLogin)}
                                onEmailChange={setEmail}
                            />
                        )}
                    </main>

                    <BottomNav activeTab={activeTab} onTabChange={handleTabChange} profilePhoto={profile.photo} />
                </div>
            )}

            {/* Common Modals */}
            {viewImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
                    <img src={viewImage} alt="Full" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
                </div>
            )}

            {recordToDelete && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setRecordToDelete(null)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black mb-4">{t('msg_confirm_delete')}</h3>
                        <div className="flex gap-3">
                            <button onClick={() => setRecordToDelete(null)} className="flex-1 py-3 bg-zinc-100 rounded-xl font-bold">{t('btn_not_now')}</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">{t('btn_erase')}</button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdate && (
                <div className={`fixed ${useV2 ? 'bottom-8' : 'bottom-24'} left-4 right-4 z-[100] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-5 rounded-[2rem] flex items-center justify-between shadow-2xl animate-fade-in-up border border-white/10`}>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Nova Versão</span>
                        <span className="text-sm font-black tracking-tight">{t('update_available')}</span>
                    </div>
                    <button
                        onClick={handleApplyUpdate}
                        className="px-6 py-3 bg-blue-600 dark:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg"
                    >
                        {t('btn_update')}
                    </button>
                </div>
            )}

            <div
                className="fixed bottom-0 right-0 w-10 h-10 z-[300] bg-transparent opacity-0"
                onClick={(e) => {
                    if (e.detail === 3) {
                        setUseV2(!useV2);
                        showToast(`Modo ${!useV2 ? 'V2 PRO' : 'V1 Core'} Ativado`, 'info');
                    }
                }}
            />
        </>
    );
};

export default AppContent;
