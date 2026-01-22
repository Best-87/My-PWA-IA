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
    onEmailChange
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="px-4 py-8 max-w-md mx-auto space-y-6 pb-24 animate-ios-slide">
            {/* VISIONOS STYLE PROFILE CARD */}
            <div className="glass-dark p-6 rounded-[2.5rem] card-shadow-lg relative overflow-hidden text-center group">
                {/* Dynamic Background Blur (VisionOS Style) */}
                {profile.photo ? (
                    <div className="absolute inset-0 z-0 opacity-40 blur-3xl scale-150 transition-all duration-1000">
                        <img src={profile.photo} alt="Background" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-50"></div>
                )}

                <div className="relative z-10 flex flex-col items-center">
                    {/* Avatar Container with Outer Glow */}
                    <div className="relative mb-4 group cursor-pointer active:scale-95 transition-all duration-300" onClick={() => fileInputRef.current?.click()}>
                        {/* Glow effect matching photo */}
                        {profile.photo && (
                            <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        )}

                        <div className="w-24 h-24 rounded-full p-1.5 bg-white/5 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden relative z-10">
                            {profile.photo ? (
                                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover rounded-full shadow-inner" />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-zinc-800 text-zinc-500 rounded-full">
                                    <span className="material-icons-round text-4xl">person</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-full backdrop-blur-sm">
                                <span className="material-icons-round text-white text-xl">camera_alt</span>
                            </div>
                        </div>
                    </div>

                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />

                    {/* Premium Typography & Inputs */}
                    <div className="space-y-1 w-full px-4">
                        <input
                            value={profile.name}
                            onChange={e => onProfileChange('name', e.target.value)}
                            className="text-2xl font-black text-center bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600 tracking-tight"
                            placeholder={t('ph_name')}
                        />
                        <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center bg-white/5 border border-white/5 px-3 py-1 rounded-full backdrop-blur-sm">
                                <input
                                    value={profile.role}
                                    onChange={e => onProfileChange('role', e.target.value)}
                                    className="text-[10px] font-black uppercase text-zinc-400 bg-transparent border-none outline-none w-20 text-center tracking-widest"
                                    placeholder={t('ph_role')}
                                />
                            </div>
                            <div className="w-1 h-1 rounded-full bg-white/20"></div>
                            <div className="flex items-center bg-blue-500/10 border border-blue-500/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                <input
                                    value={profile.store || ''}
                                    onChange={e => onProfileChange('store', e.target.value)}
                                    className="text-[10px] font-black uppercase text-blue-400 bg-transparent border-none outline-none w-20 text-center tracking-widest"
                                    placeholder={t('ph_store')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION GRID */}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={onThemeChange} className="glass dark:glass-dark p-4 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                    <span className={`material-icons-round text-2xl ${theme === 'dark' ? 'text-purple-400' : 'text-orange-400'}`}>{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                    <span className="text-xs font-bold">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                </button>
                <div className="glass dark:glass-dark p-2 rounded-3xl flex flex-col justify-center gap-1">
                    {(['pt', 'es', 'en'] as const).map(lang => (
                        <button
                            key={lang}
                            onClick={() => onLanguageChange(lang)}
                            className={`text-[10px] font-black uppercase py-1.5 rounded-xl transition-all ${currentLanguage === lang ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}
                        >
                            {lang}
                        </button>
                    ))}
                </div>
            </div>

            {/* AUTH / SAVE */}
            {session ? (
                <div className="flex gap-3">
                    <button onClick={onSaveProfile} className="flex-1 py-4 bg-primary-500 text-white rounded-[1.5rem] font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all">
                        {t('btn_save')}
                    </button>
                    <button onClick={onSignOut} className="px-6 py-4 bg-red-500/10 text-red-500 rounded-[1.5rem] font-bold active:scale-95 transition-all">
                        <span className="material-icons-round">logout</span>
                    </button>
                </div>
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
        </div>
    );
};
