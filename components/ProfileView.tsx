import React, { useRef } from 'react';
import { UserProfile, Language } from '../types';
import { useTranslation } from '../services/i18n';
import { TelegramLogin } from './v2/TelegramLogin';

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
    onTelegramAuth?: (data: any) => void;
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
    onTelegramAuth,
    onBackup,
    onRestore,
    version
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6 pb-24 animate-fade-in-up">

            {/* 1. Identity Smart Card (Redesigned) */}
            <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-300 dark:border-zinc-800 rounded p-6 flex flex-col items-center relative transition-colors shadow-sm">
                <div className="relative mb-6" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-28 h-28 rounded border-4 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative z-10 transition-transform cursor-pointer flex items-center justify-center">
                        {profile.photo ? (
                            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-icons-round text-5xl text-zinc-400">person</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-icons-round text-white">photo_camera</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-white z-20 shadow-md">
                        <span className="material-icons-round text-lg">edit</span>
                    </div>
                </div>

                <div className="w-full text-center space-y-4">
                    <div className="relative inline-block w-full">
                        <input
                            value={profile.name}
                            onChange={e => onProfileChange('name', e.target.value)}
                            className="text-2xl font-black uppercase text-center bg-transparent border-b-4 border-zinc-200 focus:border-blue-600 dark:border-zinc-700 outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-400 tracking-widest pb-1 transition-colors"
                            placeholder={t('ph_name')}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded border-2 border-zinc-300 dark:border-zinc-700">
                            <span className="material-icons-round text-zinc-500 text-sm">badge</span>
                            <span className="text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300 tracking-widest">{profile.role || t('ph_role')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 px-3 py-1 rounded border-2 border-blue-200 dark:border-blue-800">
                            <span className="material-icons-round text-blue-500 text-sm">store</span>
                            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 tracking-widest">{profile.store || t('ph_store')}</span>
                        </div>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
            </div>

            {/* 2. Settings Section (Grouped) */}
            <div className="grid grid-cols-2 gap-4 stagger-1">
                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded p-4 flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                        <span className="material-icons-round text-xs">palette</span> TEMA
                    </h4>
                    <button
                        onClick={onThemeChange}
                        className="w-full py-3 rounded bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-3 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
                    >
                        <span className={`material-icons-round text-xl ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">{theme === 'dark' ? 'OSCURO' : 'CLARO'}</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded p-4 flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                        <span className="material-icons-round text-xs">translate</span> IDIOMA
                    </h4>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded border-2 border-zinc-200 dark:border-zinc-700">
                        {(['pt', 'es', 'en'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`py-2 rounded text-[10px] font-bold uppercase transition-colors border-2 ${currentLanguage === lang ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 text-blue-600' : 'border-transparent text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
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
                    <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded p-5 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                    <span className="material-icons-round">cloud_done</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">CLOUD SYNC</h4>
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">SINC. ACTIVA</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 uppercase tracking-widest mb-1">ONLINE</span>
                                <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[120px]">{email}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={onSaveProfile}
                                className="w-full py-4 bg-emerald-600 text-white rounded font-bold border-2 border-emerald-800 active:bg-emerald-700 transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-round text-sm">save</span>
                                {t('btn_save')}
                            </button>
                            <button
                                onClick={onSignOut}
                                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-red-600 rounded font-bold border-2 border-zinc-300 dark:border-zinc-700 hover:border-red-500 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-round text-sm">logout</span>
                                SALIR
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 border-t-4 border-blue-500 border-x-2 border-b-2 border-zinc-200 dark:border-zinc-800 rounded px-5 py-6">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 rounded border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mb-4">
                                <span className="material-icons-round text-3xl">cloud_queue</span>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-widest uppercase">{isAuthModeLogin ? t('lbl_login') : t('lbl_signup')}</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">RESPALDA TUS REGISTROS</p>
                        </div>

                        {onLogin && (
                            <form onSubmit={isAuthModeLogin ? onLogin : onSignup} className="space-y-4">
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 text-xl">email</span>
                                        <input type="email" value={email} onChange={e => onEmailChange?.(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border-2 border-zinc-300 dark:border-zinc-700 focus:border-blue-500 outline-none transition-colors placeholder:text-zinc-500" placeholder="EMAIL" required />
                                    </div>
                                    <div className="relative group">
                                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 text-xl">lock</span>
                                        <input type="password" value={password} onChange={e => onPasswordChange?.(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border-2 border-zinc-300 dark:border-zinc-700 focus:border-blue-500 outline-none transition-colors placeholder:text-zinc-500" placeholder="PASSWORD" required />
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded font-bold border-2 border-blue-800 active:bg-blue-700 transition-colors text-xs uppercase tracking-widest mt-2">
                                    {isAuthLoading ? '...' : (isAuthModeLogin ? 'INICIAR SESIÓN' : 'CREAR CUENTA')}
                                </button>

                                <button type="button" onClick={onToggleAuthMode} className="w-full pt-2 text-[10px] font-bold uppercase text-zinc-500 hover:text-blue-500 transition-colors underline underline-offset-4 tracking-widest">
                                    {isAuthModeLogin ? '¿SIN CUENTA? REGÍSTRATE' : '¿YA TIENES CUENTA? ENTRAR'}
                                </button>

                                {isAuthModeLogin && onTelegramAuth && (
                                    <div className="mt-6 pt-6 border-t-2 border-zinc-100 dark:border-zinc-800">
                                        <TelegramLogin onAuth={onTelegramAuth} />
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* 4. Support & Maintenance (Real Backup Controls) */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded p-5 stagger-3 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-icons-round text-zinc-500">storage</span>
                    <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">GESTIÓN LOCAL</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onBackup}
                        className="flex flex-col items-center gap-2 p-3 rounded bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 active:bg-zinc-200 transition-colors"
                    >
                        <span className="material-icons-round text-zinc-600 dark:text-zinc-400">download</span>
                        <span className="text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300 tracking-widest">EXPORTAR</span>
                    </button>
                    <button
                        onClick={onRestore}
                        className="flex flex-col items-center gap-2 p-3 rounded bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 active:bg-zinc-200 transition-colors"
                    >
                        <span className="material-icons-round text-zinc-600 dark:text-zinc-400">upload_file</span>
                        <span className="text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300 tracking-widest">IMPORTAR</span>
                    </button>
                </div>
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
