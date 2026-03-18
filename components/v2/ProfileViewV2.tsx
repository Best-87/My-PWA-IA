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
        <div className="pb-32 animate-fade-in-up max-w-lg mx-auto px-5 space-y-6">
            {/* 1. Dashboard Hero Header */}
            <div className="relative overflow-hidden bg-white/40 dark:bg-zinc-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/20 dark:border-white/5 shadow-2xl shadow-indigo-500/10">
                {/* Background Glows */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                
                <div className="relative flex flex-col items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-1.5 shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500">
                            <div className="w-full h-full rounded-[2.2rem] bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center border-4 border-white/80 dark:border-zinc-800">
                                {profile.photo ? (
                                    <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="bg-zinc-50 dark:bg-zinc-800 w-full h-full flex items-center justify-center">
                                        <User className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl flex items-center justify-center text-blue-600 border border-zinc-100 dark:border-zinc-700 animate-bounce-subtle">
                            <Camera className="w-5 h-5" />
                        </div>
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
                    </div>

                    <div className="text-center space-y-3">
                        <div className="space-y-1">
                            {profile.username && (
                                <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">
                                    @{profile.username}
                                </span>
                            )}
                            <input
                                value={profile.name}
                                onChange={e => onProfileChange('name', e.target.value)}
                                className="text-3xl font-black text-center bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 uppercase tracking-tighter"
                                placeholder="IDENTIFIQUE-SE"
                            />
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30">
                                {profile.role || 'CONFERENTE'}
                            </span>
                            {profile.telegramId && (
                                <span className="px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-500 text-[9px] font-black uppercase tracking-widest border border-sky-500/20 flex items-center gap-1.5">
                                    <Send className="w-2.5 h-2.5 fill-current" /> Verificado
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Quick Config Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Theme Card */}
                <button
                    onClick={onThemeChange}
                    className="relative group bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/5 text-left overflow-hidden hover:scale-[1.02] transition-all"
                >
                    <div className={`absolute top-0 right-0 p-3 opacity-20 ${theme === 'dark' ? 'text-indigo-400' : 'text-amber-400'}`}>
                        {theme === 'dark' ? <Moon className="w-12 h-12" /> : <Sun className="w-12 h-12" />}
                    </div>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-zinc-500 transition-colors">Modo de Exibição</h5>
                    <p className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter">
                        {theme === 'dark' ? 'Noite Estelar' : 'Dia Radiante'}
                    </p>
                </button>

                {/* Language Card */}
                <div className="relative bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/5 text-left overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-400">
                        <Languages className="w-12 h-12" />
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                        <Languages className="w-5 h-5" />
                    </div>
                    <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Idioma Global</h5>
                    <div className="flex gap-2 p-1 bg-zinc-950/5 dark:bg-zinc-950/20 rounded-xl">
                        {(['pt', 'es'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${currentLanguage === lang ? 'bg-white dark:bg-zinc-800 shadow-xl shadow-black/10 text-emerald-600' : 'text-zinc-400'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Professional Card */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <Building className="w-4 h-4" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Credenciais</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <div className="relative group">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="LOJA / UNIDADE"
                            value={profile.store}
                            onChange={e => onProfileChange('store', e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 outline-none text-xs font-bold uppercase transition-all"
                        />
                    </div>
                    <div className="relative group">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="CARGO / FUNÇÃO"
                            value={profile.role}
                            onChange={e => onProfileChange('role', e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 outline-none text-xs font-bold uppercase transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* 4. Auth & Sunc Zone */}
            <div className={`relative overflow-hidden rounded-[3rem] p-8 ${session ? 'bg-zinc-950 text-white' : 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white'}`}>
                {/* Abstract pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                    <Cloud className="w-32 h-32" />
                </div>

                <div className="relative">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl ${session ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white/20 text-white'}`}>
                            {session ? <Cloud className="w-7 h-7" /> : <LogOut className="w-7 h-7 rotate-180" />}
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tighter">{session ? 'Sync Ativo' : 'Expanda com Nuvem'}</h4>
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                {session ? (email || profile.email) : 'Sincronize registros e fotos'}
                            </p>
                        </div>
                    </div>

                    {!session ? (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-white transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => onEmailChange?.(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/10 focus:border-white/40 outline-none text-sm font-medium transition-all placeholder:text-white/20"
                                        placeholder="EMAIL PROFISSIONAL"
                                    />
                                </div>
                                <div className="relative group">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-white transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => onPasswordChange?.(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/10 focus:border-white/40 outline-none text-sm font-medium transition-all placeholder:text-white/20"
                                        placeholder="SENHA DE ACESSO"
                                    />
                                </div>
                                <button
                                    onClick={isAuthModeLogin ? onLogin as any : onSignup as any}
                                    className="w-full py-5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all"
                                >
                                    {isAuthLoading ? 'Processando...' : (isAuthModeLogin ? 'Acessar Conta' : 'Criar minha conta')}
                                </button>
                                
                                <div className="flex items-center justify-between px-2 pt-2">
                                    <button
                                        onClick={onToggleAuthMode}
                                        className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        {isAuthModeLogin ? 'Criar Nova Conta' : 'Voltar ao Login'}
                                    </button>
                                    
                                    {isAuthModeLogin && onTelegramAuth && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-white/20 uppercase">OIDC</span>
                                            <TelegramLogin onAuth={onTelegramAuth} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={onSaveProfile}
                                className="py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/10"
                            >
                                <Save className="w-5 h-5" /> Salvar Tudo
                            </button>
                            <button
                                onClick={onSignOut}
                                className="py-4 bg-red-500/20 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-red-500/20"
                            >
                                <LogOut className="w-5 h-5" /> Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Danger Zone */}
            <div className="pt-4 flex flex-col gap-4">
                <button
                    onClick={onClearCache}
                    className="w-full py-5 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-600 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all border border-transparent dark:border-zinc-900"
                >
                    <AlertTriangle className="w-4 h-4" /> Higienizar Cache do Dispositivo
                </button>
                
                <div className="flex flex-col items-center gap-2 opacity-20 mb-10">
                    <div className="h-px w-12 bg-zinc-500" />
                    <span className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase">{version} MASTER PRO</span>
                </div>
            </div>
        </div>
    );
};
