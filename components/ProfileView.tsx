import React, { useRef } from 'react';
import { UserProfile, Language } from '../types';
import { useTranslation } from '../services/i18n';

interface ProfileViewProps {
    profile: UserProfile;
    session: any;
    email: string;
    isAuthLoading: boolean;
    onSaveProfile: () => void;
    onSignOut: () => void;
    onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onThemeChange: () => void;
    theme: 'light' | 'dark';
    onLanguageChange: (lang: Language) => void;
    currentLanguage: Language;
    onProfileChange: (field: keyof UserProfile, value: string) => void;
    password?: string;
    onPasswordChange?: (val: string) => void;
    onLogin?: (e: React.FormEvent) => void;
    onSignup?: (e: React.FormEvent) => void;
    isAuthModeLogin?: boolean;
    onToggleAuthMode?: () => void;
    onEmailChange?: (val: string) => void;
    onBackup: () => void;
    onRestore: () => void;
    version: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
    profile,
    session,
    email,
    isAuthLoading,
    onSaveProfile,
    onSignOut,
    onPhotoUpload,
    onThemeChange,
    theme,
    onLanguageChange,
    currentLanguage,
    onProfileChange,
    password,
    onPasswordChange,
    onLogin,
    onSignup,
    isAuthModeLogin,
    onToggleAuthMode,
    onEmailChange,
    onBackup,
    onRestore,
    version
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6 pb-24 animate-fade-in-up">

            {/* 1. Identity Smart Card (Redesigned) */}
            <div className="smart-card p-6 flex flex-col items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>

                <div className="relative mb-6" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-28 h-28 rounded-3xl border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden relative z-10 rotate-3 transition-transform hover:rotate-0 cursor-pointer">
                        {profile.photo ? (
                            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <span className="material-icons-round text-5xl">person</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-icons-round text-white">photo_camera</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary shadow-xl rounded-2xl flex items-center justify-center text-white z-20 border-4 border-white dark:border-zinc-900 animate-bounce-slow">
                        <span className="material-icons-round text-lg">edit</span>
                    </div>
                </div>

                <div className="w-full text-center space-y-4">
                    <div className="relative inline-block w-full">
                        <input
                            value={profile.name}
                            onChange={e => onProfileChange('name', e.target.value)}
                            className="text-3xl font-black text-center bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 tracking-tighter"
                            placeholder={t('ph_name')}
                        />
                        <div className="h-0.5 w-12 bg-primary/20 mx-auto mt-1 rounded-full"></div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/5 px-4 py-2 rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-sm">
                            <span className="material-icons-round text-zinc-400 text-sm">badge</span>
                            <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300 tracking-widest">{profile.role || t('ph_role')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 shadow-sm">
                            <span className="material-icons-round text-primary text-sm">store</span>
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">{profile.store || t('ph_store')}</span>
                        </div>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
            </div>

            {/* 2. Settings Section (Grouped) */}
            <div className="grid grid-cols-2 gap-4 stagger-1">
                <div className="smart-card p-4 flex flex-col gap-3">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                        <span className="material-icons-round text-xs">palette</span> Tema
                    </h4>
                    <button
                        onClick={onThemeChange}
                        className="w-full py-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className={`material-icons-round text-xl ${theme === 'dark' ? 'text-purple-400' : 'text-orange-400'}`}>
                            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                        </span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                    </button>
                </div>

                <div className="smart-card p-4 flex flex-col gap-3">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                        <span className="material-icons-round text-xs">translate</span> Idioma
                    </h4>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-white/5 p-1 rounded-xl">
                        {(['pt', 'es', 'en'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${currentLanguage === lang ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-zinc-400 opacity-60'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Cloud & Auth Section (Clean & Minimal) */}
            <div className="stagger-2">
                {session ? (
                    <div className="smart-card p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                                    <span className="material-icons-round">cloud_done</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-zinc-800 dark:text-white">Cloud Sync</h4>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Sincronización activa</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest mb-1 animate-pulse">Online</span>
                                <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[120px]">{email}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={onSaveProfile}
                                className="w-full py-4 bg-primary text-white rounded-3xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-round text-sm">save</span>
                                {t('btn_save')}
                            </button>
                            <button
                                onClick={onSignOut}
                                className="w-full py-4 bg-zinc-50 dark:bg-white/5 text-red-500 rounded-3xl font-black border border-red-500/10 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-round text-sm">logout</span>
                                Salir de la cuenta
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="smart-card p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
                                <span className="material-icons-round text-4xl">cloud_queue</span>
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 leading-none">{isAuthModeLogin ? t('lbl_login') : t('lbl_signup')}</h3>
                            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Respalda tus registros en la nube</p>
                        </div>

                        {onLogin && (
                            <form onSubmit={isAuthModeLogin ? onLogin : onSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 group-focus-within:text-primary transition-colors text-lg">email</span>
                                        <input type="email" value={email} onChange={e => onEmailChange?.(e.target.value)} className="w-full pl-12 pr-6 py-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 text-sm font-bold border border-zinc-100 dark:border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700" placeholder="Email" required />
                                    </div>
                                    <div className="relative group">
                                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 group-focus-within:text-primary transition-colors text-lg">lock</span>
                                        <input type="password" value={password} onChange={e => onPasswordChange?.(e.target.value)} className="w-full pl-12 pr-6 py-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 text-sm font-bold border border-zinc-100 dark:border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700" placeholder="Password" required />
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl font-black shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
                                    {isAuthLoading ? '...' : (isAuthModeLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                                </button>

                                <button type="button" onClick={onToggleAuthMode} className="w-full py-2 text-[10px] font-black uppercase text-primary tracking-widest hover:opacity-80 transition-opacity">
                                    {isAuthModeLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entrar'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* 4. Support & Maintenance (Real Backup Controls) */}
            <div className="smart-card p-6 stagger-3 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-icons-round text-primary">storage</span>
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Gestión de Datos Local</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onBackup}
                        className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 hover:bg-primary/5 hover:border-primary/20 transition-all group"
                    >
                        <span className="material-icons-round text-zinc-400 group-hover:text-primary transition-colors">download</span>
                        <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-primary transition-colors">Exportar</span>
                    </button>
                    <button
                        onClick={onRestore}
                        className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 hover:bg-orange-500/5 hover:border-orange-500/20 transition-all group"
                    >
                        <span className="material-icons-round text-zinc-400 group-hover:text-orange-500 transition-colors">upload_file</span>
                        <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-orange-500 transition-colors">Importar</span>
                    </button>
                </div>
                <p className="text-[9px] text-zinc-400 text-center font-bold uppercase tracking-tighter">Útil para mover datos entre dispositivos sin cuenta cloud</p>
            </div>

            {/* 5. Footer Version Info (Adaptive) */}
            <div className="pt-4 pb-8 text-center opacity-30">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex flex-col gap-1">
                    <span>{version} Pro</span>
                    <span className="text-[8px] opacity-60">Logística Inteligente © 2026</span>
                </span>
            </div>
        </div>
    );
};
