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
        <div className="px-4 py-8 max-w-md mx-auto space-y-4 pb-24 animate-slide-up-fade">
            {/* COMPACT PROFILE CARD */}
            <div className="glass dark:glass-dark p-5 rounded-[2rem] card-shadow-lg relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-tr from-blue-500/10 to-purple-500/10"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto rounded-full p-1 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden cursor-pointer group mb-3 relative" onClick={() => fileInputRef.current?.click()}>
                        {profile.photo ? (
                            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full bg-zinc-100 dark:bg-zinc-700 text-zinc-300 dark:text-zinc-500">
                                <span className="material-icons-round text-3xl">person</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                            <span className="material-icons-round text-white">edit</span>
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />

                    {/* Compact Inputs */}
                    <div className="space-y-2">
                        <input
                            value={profile.name}
                            onChange={e => onProfileChange('name', e.target.value)}
                            className="text-xl font-black text-center bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300"
                            placeholder="Tu Nombre"
                        />
                        <div className="flex justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                            <input
                                value={profile.role}
                                onChange={e => onProfileChange('role', e.target.value)}
                                className="text-right text-zinc-500 bg-transparent border-none outline-none w-24"
                                placeholder="Cargo"
                            />
                            <span className="text-zinc-300">|</span>
                            <input
                                value={profile.store || ''}
                                onChange={e => onProfileChange('store', e.target.value)}
                                className="text-left text-primary-500 bg-transparent border-none outline-none w-24"
                                placeholder="Tienda"
                            />
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
