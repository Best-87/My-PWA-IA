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
        <div className="px-4 py-8 max-w-xl mx-auto space-y-6 pb-32 animate-slide-up-fade">
            {/* Header Profile Card */}
            <div className="glass dark:glass-dark p-6 rounded-[2rem] card-shadow-lg text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>

                <div className="relative z-10">
                    {/* Avatar */}
                    <div className="relative inline-block mb-4">
                        <div className="w-28 h-28 rounded-full p-1 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                            {profile.photo ? (
                                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover rounded-full group-hover:opacity-80 transition-opacity" />
                            ) : (
                                <div className="w-full h-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                                    <span className="material-icons-round text-4xl text-zinc-300 dark:text-zinc-500">person</span>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <span className="material-icons-round text-white">camera_alt</span>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={onPhotoUpload}
                        />
                    </div>

                    {/* Name & Role */}
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-1">{profile.name}</h2>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">{profile.role}</p>

                    {/* Stats Row */}
                    <div className="flex justify-center gap-2 mb-6">
                        {profile.store && (
                            <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800">
                                {profile.store}
                            </span>
                        )}
                        {session && (
                            <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold border border-green-100 dark:border-green-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Cloud Active
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Auth Section (if not logged in) */}
            {!session && onLogin && (
                <div className="glass dark:glass-dark p-6 rounded-[2rem] card-shadow-lg space-y-4 border-l-4 border-l-primary-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-600 dark:text-primary-400">
                            <span className="material-icons-round">cloud_queue</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{t('lbl_auth_title') || 'Sincronización Cloud'}</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Inicia sesión para respaldar tus datos.</p>
                        </div>
                    </div>

                    <form onSubmit={isAuthModeLogin ? onLogin : onSignup} className="space-y-3">
                        {!isAuthModeLogin && (
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 mb-1 block">{t('lbl_name')}</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => onProfileChange('name', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none transition-all dark:text-white"
                                    placeholder={t('ph_name')}
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 mb-1 block">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => onEmailChange && onEmailChange(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none transition-all dark:text-white"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 mb-1 block">{t('lbl_password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => onPasswordChange && onPasswordChange(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none transition-all dark:text-white"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isAuthLoading}
                            className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAuthLoading ? t('btn_analyzing') : (isAuthModeLogin ? t('btn_signin') : t('btn_signup'))}
                        </button>

                        <button
                            type="button"
                            onClick={onToggleAuthMode}
                            className="w-full text-center text-xs font-bold text-primary-500 hover:text-primary-600 py-2"
                        >
                            {isAuthModeLogin ? t('lbl_signup') : t('lbl_login')}
                        </button>
                    </form>
                </div>
            )}

            {/* Edit Form */}
            <div className="space-y-2">
                <h3 className="px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('lbl_edit_profile')}</h3>
                <div className="glass dark:glass-dark p-6 rounded-[2rem] card-shadow-lg space-y-4">

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 mb-1 block">{t('lbl_name')}</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => onProfileChange('name', e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 mb-1 block">{t('lbl_role')}</label>
                                <input
                                    type="text"
                                    value={profile.role}
                                    onChange={(e) => onProfileChange('role', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 mb-1 block">{t('lbl_store')}</label>
                                <input
                                    type="text"
                                    value={profile.store}
                                    onChange={(e) => onProfileChange('store', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        <button
                            onClick={onSaveProfile}
                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 btn-press"
                        >
                            {t('btn_save')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div className="space-y-2">
                <h3 className="px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('lbl_settings')}</h3>
                <div className="glass dark:glass-dark p-6 rounded-[2rem] card-shadow-lg space-y-4">

                    {/* Theme Toggle */}
                    <button
                        onClick={onThemeChange}
                        className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-purple-500 text-white' : 'bg-orange-400 text-white'}`}>
                                <span className="material-icons-round text-sm">{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                            </div>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                        </div>
                        <span className="material-icons-round text-zinc-400">chevron_right</span>
                    </button>

                    {/* Language Toggle */}
                    <div className="grid grid-cols-3 gap-2">
                        {(['pt', 'es', 'en'] as const).map((lang) => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${currentLanguage === lang
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                                    : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                    }`}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Sign Out */}
                    {session && (
                        <button
                            onClick={onSignOut}
                            className="w-full mt-4 flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors btn-press"
                        >
                            <span className="material-icons-round">logout</span>
                            {t('btn_signout')}
                        </button>
                    )}
                </div>

                <div className="text-center text-xs text-zinc-400 dark:text-zinc-600 font-mono pt-4">
                    v3.0.0 (Native Design)
                </div>
            </div>
        </div>
    );
};
