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
        <div className="pb-10 animate-fade-in-up max-w-lg mx-auto px-4 space-y-3">
            {/* 1. Dashboard Hero Header */}
            <div className="relative overflow-hidden bg-white/40 dark:bg-zinc-900/40 backdrop-blur-3xl rounded-[2.5rem] p-4 border border-white/20 dark:border-white/5 shadow-2xl shadow-indigo-500/10">
                {/* Background Glows */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px]" />
                
                <div className="relative flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 shadow-xl shadow-blue-500/20">
                            <div className="w-full h-full rounded-[0.9rem] bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center border-2 border-white/80 dark:border-zinc-800">
                                {profile.photo ? (
                                    <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="bg-zinc-50 dark:bg-zinc-800 w-full h-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg flex items-center justify-center text-blue-600 border border-zinc-100 dark:border-zinc-700">
                            <Camera className="w-3 h-3" />
                        </div>
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-col">
                            {profile.username && (
                                <span className="text-[8px] font-black text-indigo-500/60 uppercase tracking-widest leading-none mb-0.5">
                                    @{profile.username}
                                </span>
                            )}
                            <input
                                value={profile.name}
                                onChange={e => onProfileChange('name', e.target.value)}
                                className="text-xl font-black bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 uppercase tracking-tight"
                                placeholder="IDENTIFIQUE-SE"
                            />
                        </div>
                        
                        <div className="flex gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                                {profile.role || 'CONFERENTE'}
                            </span>
                            {profile.telegramId && (
                                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 text-[8px] font-black uppercase tracking-widest border border-sky-500/20 flex items-center gap-1">
                                    <Send className="w-2 h-2 fill-current" /> Verificado
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Quick Config Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Theme Card */}
                <button
                    onClick={onThemeChange}
                    className="relative group bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white/20 dark:border-white/5 text-left overflow-hidden hover:scale-[1.01] transition-all"
                >
                    <div className={`absolute top-0 right-0 p-2 opacity-10 ${theme === 'dark' ? 'text-indigo-400' : 'text-amber-400'}`}>
                        {theme === 'dark' ? <Moon className="w-8 h-8" /> : <Sun className="w-8 h-8" />}
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <h5 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Exibição</h5>
                    <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tighter">
                        {theme === 'dark' ? 'Noite' : 'Radiante'}
                    </p>
                </button>

                {/* Language Card */}
                <div className="relative bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white/20 dark:border-white/5 text-left overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 text-emerald-400">
                        <Languages className="w-8 h-8" />
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3">
                        <Languages className="w-4 h-4" />
                    </div>
                    <h5 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">Global</h5>
                    <div className="flex gap-1.5 p-1 bg-zinc-950/5 dark:bg-zinc-950/20 rounded-lg">
                        {(['pt', 'es'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase transition-all ${currentLanguage === lang ? 'bg-white dark:bg-zinc-800 shadow-lg shadow-black/5 text-emerald-600' : 'text-zinc-400'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Professional Card (Very compact) */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-4 border border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                <div className="relative group">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300 group-focus-within:text-orange-500" />
                    <input
                        type="text"
                        placeholder="LOJA"
                        value={profile.store}
                        onChange={e => onProfileChange('store', e.target.value)}
                        className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/20 outline-none text-[10px] font-bold uppercase"
                    />
                </div>
                <div className="relative group">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300 group-focus-within:text-orange-500" />
                    <input
                        type="text"
                        placeholder="CARGO"
                        value={profile.role}
                        onChange={e => onProfileChange('role', e.target.value)}
                        className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/20 outline-none text-[10px] font-bold uppercase"
                    />
                </div>
            </div>

            {/* 4. Auth & Sync Zone (Slimmed down) */}
            <div className={`relative overflow-hidden rounded-[2.5rem] p-5 ${session ? 'bg-zinc-950 text-white' : 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Cloud className="w-16 h-16" />
                </div>

                <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${session ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-white/20'}`}>
                            {session ? <Cloud className="w-5 h-5" /> : <LogOut className="w-5 h-5 rotate-180" />}
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-tighter leading-none mb-0.5">{session ? 'Sincronizado' : 'Nuvem Ativa'}</h4>
                            <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest truncate max-w-[150px]">
                                {session ? (email || profile.email) : 'Proteja seus dados'}
                            </p>
                        </div>
                    </div>

                    {!session ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-1 gap-1.5">
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => onEmailChange?.(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 outline-none text-xs"
                                        placeholder="EMAIL"
                                    />
                                </div>
                                <div className="relative group">
                                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => onPasswordChange?.(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 outline-none text-xs"
                                        placeholder="SENHA"
                                    />
                                </div>
                                <button
                                    onClick={isAuthModeLogin ? onLogin as any : onSignup as any}
                                    className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98]"
                                >
                                    {isAuthLoading ? '⌛' : (isAuthModeLogin ? 'ENTRAR' : 'REGISTRAR')}
                                </button>
                                
                                <div className="flex items-center justify-between px-1">
                                    <button onClick={onToggleAuthMode} className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                                        {isAuthModeLogin ? 'Criar Conta' : 'Login'}
                                    </button>
                                    {isAuthModeLogin && onTelegramAuth && (
                                        <TelegramLogin onAuth={onTelegramAuth} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={onSaveProfile}
                                className="py-2.5 bg-white/10 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-1.5"
                            >
                                <Save className="w-4 h-4" /> Salvar
                            </button>
                            <button
                                onClick={onSignOut}
                                className="py-2.5 bg-red-500/20 text-red-400 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-1.5 border border-red-500/10"
                            >
                                <LogOut className="w-4 h-4" /> Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Clean Action Zone */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={onClearCache}
                    className="w-full py-4 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-600 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 border border-transparent dark:border-zinc-900"
                >
                    <AlertTriangle className="w-3.5 h-3.5" /> Higienizar Cache
                </button>
                
                <div className="text-center opacity-20">
                    <span className="text-[7px] font-black tracking-[0.5em] text-zinc-500 uppercase">{version} MASTER PRO</span>
                </div>
            </div>
        </div>
    );
};
