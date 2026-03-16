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
        <div className="space-y-8 pb-32 animate-fade-in-up max-w-lg mx-auto">
            {/* 1. Profile Header Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                <div className="relative group mb-6" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-lg shadow-blue-500/30">
                        <div className="w-full h-full rounded-[2.3rem] bg-white dark:bg-zinc-800 overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900">
                            {profile.photo ? (
                                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-zinc-300" />
                            )}
                        </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                        <Camera className="w-5 h-5" />
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
                </div>

                <div className="w-full text-center space-y-2">
                    <input
                        value={profile.name}
                        onChange={e => onProfileChange('name', e.target.value)}
                        className="text-2xl font-black text-center bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 uppercase tracking-tighter"
                        placeholder="SEU NOME"
                    />
                    <div className="flex items-center justify-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                            {profile.role || 'CONFERENTE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Professional Credentials */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Building className="w-4 h-4" /> Informações Profissionais
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    <div className="relative group">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="UNIDADE / LOJA"
                            value={profile.store}
                            onChange={e => onProfileChange('store', e.target.value)}
                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium uppercase transition-all"
                        />
                    </div>

                    <div className="relative group">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="CARGO / FUNÇÃO"
                            value={profile.role}
                            onChange={e => onProfileChange('role', e.target.value)}
                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium uppercase transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* 3. Preferences */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Palette className="w-4 h-4" /> Tema
                    </h3>
                    <button
                        onClick={onThemeChange}
                        className="w-full py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center gap-3 active:scale-95 transition-all border border-zinc-100 dark:border-zinc-700"
                    >
                        {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        <span className="text-xs font-black uppercase tracking-widest">{theme === 'dark' ? 'Noite' : 'Dia'}</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Languages className="w-4 h-4" /> Idioma
                    </h3>
                    <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                        {(['pt', 'es'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang)}
                                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${currentLanguage === lang ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600' : 'text-zinc-400'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Cloud Integration */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 dark:from-zinc-900 dark:to-zinc-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-zinc-900/20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${session ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            <Cloud className={`w-6 h-6 ${isAuthLoading ? 'animate-bounce' : ''}`} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest">{session ? 'Conta Pro Conectada' : 'Nuvem Desconectada'}</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {isAuthLoading ? 'Sincronizando dados...' : (session ? (email || profile.email) : 'Salve registros na sua conta')}
                                </p>
                                {profile.telegramId && (
                                    <span className="bg-sky-500/20 text-sky-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 border border-sky-500/30">
                                        <Send className="w-2 h-2 fill-current" /> Telegram
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {!session ? (
                    <div className="space-y-4">
                        {onLogin && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => onEmailChange?.(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none text-sm font-medium transition-all"
                                        placeholder="EMAIL"
                                    />
                                </div>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => onPasswordChange?.(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none text-sm font-medium transition-all"
                                        placeholder="PASSWORD"
                                    />
                                </div>
                                <button
                                    onClick={isAuthModeLogin ? onLogin as any : onSignup as any}
                                    className="w-full py-4 bg-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-2"
                                >
                                    {isAuthLoading ? '...' : (isAuthModeLogin ? 'Entrar' : 'Cadastrar')}
                                </button>
                                <button
                                    onClick={onToggleAuthMode}
                                    className="w-full text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    {isAuthModeLogin ? 'Criar Conta Grátis' : 'Já tenho conta'}
                                </button>

                                {isAuthModeLogin && onTelegramAuth && (
                                    <>
                                        <div className="flex items-center gap-4 py-2">
                                            <div className="h-px flex-1 bg-white/10" />
                                            <span className="text-[10px] font-black text-zinc-500 uppercase">Ou</span>
                                            <div className="h-px flex-1 bg-white/10" />
                                        </div>
                                        <TelegramLogin onAuth={onTelegramAuth} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={onSaveProfile}
                            className="py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all"
                        >
                            <Save className="w-4 h-4" /> Salvar
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onSignOut(); }}
                            className="py-4 bg-red-500/20 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/30 active:scale-95 transition-all border border-red-500/20"
                        >
                            <LogOut className="w-4 h-4" /> Sair da Conta
                        </button>
                    </div>
                )}
            </div>

            {/* 5. Data Management */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Dados e Segurança
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onBackup}
                        className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800 border-none hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                    >
                        <Download className="w-6 h-6 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Backup</span>
                    </button>
                    <button
                        onClick={onRestore}
                        className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800 border-none hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                    >
                        <Upload className="w-6 h-6 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Importar</span>
                    </button>
                </div>
                
                <button
                    onClick={onClearCache}
                    className="w-full py-4 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-orange-100 dark:border-orange-900/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <AlertTriangle className="w-4 h-4" /> Limpar Cache do App
                </button>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center gap-4 py-8 opacity-20">
                <div className="h-px w-20 bg-zinc-500" />
                <div className="text-center font-black tracking-[0.5em] text-[10px] uppercase text-zinc-500">
                    {version} PRO
                </div>
            </div>
        </div>
    );
};
