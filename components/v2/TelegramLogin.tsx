
import React, { useEffect, useState } from 'react';
import { Send, Loader2, AlertCircle, Info } from 'lucide-react';

interface TelegramLoginProps {
    onAuth: (data: any) => void;
}

declare global {
    interface Window {
        Telegram?: {
            Login: {
                init: (options: any, callback: (data: any) => void) => void;
                open: () => void;
                auth: (options: any, callback: (data: any) => void) => void;
            }
        }
    }
}

export const TelegramLogin: React.FC<TelegramLoginProps> = ({ onAuth }) => {
    const [error, setError] = useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const botId = import.meta.env.VITE_TELEGRAM_BOT_ID || '';
    
    const handleNavigation = () => {
        if (!botId) {
            setError('Falta el ID numérico del bot en Vercel (VITE_TELEGRAM_BOT_ID)');
            return;
        }

        const currentUrl = window.location.origin;
        // La URL de Return es esta misma página, para que el App.tsx intercepte los QueryStrings.
        const returnUrl = encodeURIComponent(currentUrl);
        const originUrl = encodeURIComponent(currentUrl);
        
        // Redirige a la página segura de Telegram Org. Cero bloqueos de navegador.
        const authUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${originUrl}&embed=0&request_access=write&return_to=${returnUrl}`;
        window.location.href = authUrl;
    };

    return (
        <div className="w-full flex flex-col items-center gap-3 mt-2">
            {!botId && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-sm w-full">
                    <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-zinc-600 dark:text-zinc-300 leading-tight">
                        Se requiere <b>VITE_TELEGRAM_BOT_ID</b> en Vercel para auto-login nativo. (Los números de tu token).
                    </p>
                </div>
            )}

            <button 
                onClick={handleNavigation}
                disabled={!botId}
                className={`w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${
                    botId ? 'bg-[#2AABEE] text-white hover:bg-[#229ED9] shadow-[#2AABEE]/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                }`}
            >
                <Send className="w-4 h-4 fill-current transition-transform group-hover:translate-x-1" />
                <span>Continuar con Telegram Integrado</span>
            </button>
            
            {error && (
                <div className="flex items-center gap-2 p-3 w-full bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-[9px] text-red-600 font-bold uppercase">{error}</span>
                </div>
            )}
        </div>
    );
};
