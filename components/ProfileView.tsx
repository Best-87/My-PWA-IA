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
    version
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6 pb-24 animate-fade-in-up">
            {/* 1. Smart Profile Card */}
            <div className="smart-card p-6 flex flex-col items-center relative overflow-hidden">
                <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800 shadow-xl overflow-hidden relative z-10">
                        {profile.photo ? (
                            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <span className="material-icons-round text-4xl">person</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-icons-round text-white">camera_alt</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-white shadow-lg pointer-events-none">
                        <span className="material-icons-round text-sm">edit</span>
                    </div>
                </div>

                <div className="w-full text-center space-y-3">
                    <input
                        value={profile.name}
                        onChange={e => onProfileChange('name', e.target.value)}
                        className="text-2xl font-black text-center bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300"
                        placeholder={t('ph_name')}
                    />
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest bg-zinc-50 dark:bg-white/5 px-3 py-1 rounded-full">{profile.role || t('ph_role')}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full">{profile.store || t('ph_store')}</span>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
            </div>

            {/* 2. Actions Grid (Routines Layout) */}
            <div className="flex items-center justify-between gap-3 stagger-1">
                <button
                    onClick={onThemeChange}
                    className="flex-1 aspect-square rounded-[1.5rem] bg-white dark:bg-zinc-800 shadow-md flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-zinc-300 btn-press border border-zinc-100 dark:border-white/5"
                >
                    <span className={`material-icons-round text-3xl ${theme === 'dark' ? 'text-purple-400' : 'text-orange-400'}`}>{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                </button>

                <div className="flex-1 aspect-square rounded-[1.5rem] bg-white dark:bg-zinc-800 shadow-md border border-zinc-100 dark:border-white/5 grid grid-cols-1 overflow-hidden">
                    {(['pt', 'es', 'en'] as const).map(lang => (
                        <button
                            key={lang}
                            onClick={() => onLanguageChange(lang)}
                            className={`text-[9px] font-black uppercase transition-all flex items-center justify-center ${currentLanguage === lang ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}
                        >
                            {lang}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onSignOut}
                    className="flex-1 aspect-square rounded-[1.5rem] bg-red-50 dark:bg-red-900/10 shadow-md flex flex-col items-center justify-center gap-1 text-red-500 btn-press border border-red-100 dark:border-red-900/20"
                >
                    <span className="material-icons-round text-3xl">logout</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Salir</span>
                </button>
            </div>

            {/* 3. Save Changes Button / Auth Section */}
            {session ? (
                <button
                    onClick={onSaveProfile}
                    className="w-full py-4 bg-gradient-header text-white rounded-[1.5rem] font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest stagger-2"
                >
                    {t('btn_save')}
                </button>
            ) : (

                <div className="glass dark:glass-dark p-5 rounded-[2rem]">
                    <h3 className="text-center text-xs font-bold uppercase text-zinc-500 mb-3">{isAuthModeLogin ? t('lbl_login') : t('lbl_signup')}</h3>
                    {onLogin && (
                        <form onSubmit={isAuthModeLogin ? onLogin : onSignup} className="space-y-3">
                            <input type="email" value={email} onChange={e => onEmailChange?.(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm outline-none" placeholder="Email" required />
                            <input type="password" value={password} onChange={e => onPasswordChange?.(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm outline-none" placeholder="Password" required />
                            <button type="submit" className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">
                                {isAuthLoading ? '...' : (isAuthModeLogin ? 'Entrar' : 'Crear Cuenta')}
                            </button>
                            <div className="text-center">
                                <button type="button" onClick={onToggleAuthMode} className="text-xs font-bold text-primary-500">{isAuthModeLogin ? 'Crear cuenta' : 'Ya tengo cuenta'}</button>
                            </div>
                        </form>
                    )}
                </div>
            )}
            {/* 4. Footer Version Info */}
            <div className="pt-4 text-center opacity-30 px-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    {version} Pro • Logística Inteligente
                </span>
            </div>
        </div>
    );
};
