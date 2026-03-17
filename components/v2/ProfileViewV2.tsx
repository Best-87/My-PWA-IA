import React, { useRef } from 'react';
import { UserProfile, Language } from '../../types';
import { useTranslation } from '../../services/i18n';
import {
    User, Mail, Shield, Building, Palette, Languages,
    LogOut, Save, Cloud, Download, Upload, AlertTriangle,
    Camera, Bell, Info, Moon, Sun, Send
} from 'lucide-react';
import { TelegramLogin } from './TelegramLogin';

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
    onClearCache?: () => void;
    onTelegramAuth?: (data: any) => void;
    version: string;
}

export const ProfileViewV2: React.FC<ProfileViewProps> = ({
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
    onClearCache,
    version
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4 pb-20 animate-fade-in-up max-w-lg mx-auto px-4">
            {/* 1. Profile Header Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-4 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
                <div className="relative group" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20">
                        <div className="w-full h-full rounded-[0.9rem] bg-white dark:bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-white dark:border-zinc-900">
                            {profile.photo ? (
                                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-zinc-300" />
                            )}
                        </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-blue-600">
                        <Camera className="w-3 h-3" />
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
                </div>

                <div className="flex-1 min-w-0">
                    <input
                        value={profile.name}
                        onChange={e => onProfileChange('name', e.target.value)}
                        className="text-lg font-black bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 uppercase tracking-tight"
                        placeholder="SEU NOME"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            {profile.role || 'CONFERENTE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Professional & Preferences Row */}
            <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="LOJA"
                            value={profile.store}
                            onChange={e => onProfileChange('store', e.target.value)}
                            className="w-full pl-9 pr-3 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase"
                        />
                    </div>
                    <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="CARGO"
                            value={profile.role}
                            onChange={e => onProfileChange('role', e.target.value)}
                            className="w-full pl-9 pr-3 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2 border border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <button
                        onClick={onThemeChange}
                        className="flex-1 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center gap-2 border border-transparent dark:border-zinc-700"
                    >
                        {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
                    </button>
                    
                    <div className="flex p-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex-[1.5]">
                        {(['pt', 'es'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${currentLanguage === lang ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600' : 'text-zinc-400'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Cloud Integration Card */}
            <div className="bg-zinc-900 dark:bg-zinc-900 rounded-[2rem] p-5 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        <Cloud className={`w-5 h-5 ${isAuthLoading ? 'animate-bounce' : ''}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                            {session ? 'Nuvem Conectada' : 'Nuvem Desconectada'}
                        </h4>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                            {session ? (email || profile.email) : 'Sincronizar em Nuvem'}
                        </p>
                    </div>
                    {session && profile.telegramId && (
                        <span className="bg-sky-500/20 text-sky-400 text-[8px] font-black px-2 py-1 rounded-lg border border-sky-500/30 flex items-center gap-1">
                            <Send className="w-2 h-2 fill-current" /> TG
                        </span>
                    )}
                </div>

                {!session ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => onEmailChange?.(e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-medium"
                                    placeholder="USUÁRIO"
                                />
                            </div>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => onPasswordChange?.(e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-medium"
                                    placeholder="SENHA"
                                />
                            </div>
                        </div>
                        <button
                            onClick={isAuthModeLogin ? onLogin as any : onSignup as any}
                            className="w-full py-3 bg-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            {isAuthLoading ? '...' : (isAuthModeLogin ? 'ENTRAR' : 'REGISTRAR')}
                        </button>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onToggleAuthMode}
                                className="text-[9px] font-black text-zinc-500 uppercase tracking-widest"
                            >
                                {isAuthModeLogin ? 'CRIAR CONTA' : 'LOGAR'}
                            </button>
                            {isAuthModeLogin && onTelegramAuth && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-zinc-600 uppercase">Ou</span>
                                    <TelegramLogin onAuth={onTelegramAuth} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onSaveProfile}
                            className="py-3 bg-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all"
                        >
                            <Save className="w-3.5 h-3.5" /> SALVAR
                        </button>
                        <button
                            onClick={onSignOut}
                            className="py-3 bg-red-500/10 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/10"
                        >
                            <LogOut className="w-3.5 h-3.5" /> SAIR
                        </button>
                    </div>
                )}
            </div>

            {/* 4. Action Bar */}
            <div className="flex gap-2">
                <button
                    onClick={onClearCache}
                    className="flex-1 py-3 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <AlertTriangle className="w-3.5 h-3.5" /> LIMPAR CACHE
                </button>
            </div>

            {/* Footer */}
            <div className="text-center font-black tracking-[0.3em] text-[8px] uppercase text-zinc-300 dark:text-zinc-800 py-4">
                {version} PRO
            </div>
        </div>
    );
};
