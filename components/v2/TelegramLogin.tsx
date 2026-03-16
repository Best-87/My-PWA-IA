
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // O Bot ID é a primeira parte do token do bot (ex: 123456789)
    const clientId = import.meta.env.VITE_TELEGRAM_BOT_ID;

    const handleLogin = () => {
        if (!clientId) {
            setError("ID do Bot não configurado (VITE_TELEGRAM_BOT_ID).");
            setShowHelp(true);
            return;
        }

        if (!window.Telegram || !window.Telegram.Login) {
            setError("O script do Telegram não foi carregado corretamente.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Documentação Sugerida: Iniciamos auth() diretamente sem widget para fluxo OIDC
            window.Telegram.Login.auth(
                {
                    client_id: clientId,
                    request_access: ['phone' as any],
                },
                (data: any) => {
                    setIsLoading(false);
                    if (data && data.error) {
                        setError(data.error);
                    } else if (data && data.hash) {
                        onAuth(data); // Pasamos todo el objeto data nativo de Telegram
                    } else if (!data) {
                        setError("O login foi cancelado ou falhou.");
                    }
                }
            );
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || "Erro ao iniciar autenticação");
            console.error("Telegram Auth Error:", err);
        }
    };

    return (
        <div className="w-full space-y-3">
            <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-4 bg-[#24A1DE] hover:bg-[#208abf] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Send className="w-5 h-5 fill-current" />
                )}
                {isLoading ? 'Conectando...' : 'Log in With Telegram'}
            </button>
            
            {error && (
                <div className="flex flex-col gap-2 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-500 text-[10px] font-black uppercase">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                    {showHelp && (
                        <p className="text-[9px] text-zinc-500 font-bold uppercase leading-relaxed">
                            💡 Obtenha o ID do seu bot no @BotFather. É a parte numérica antes dos dois pontos no seu Bot Token. 
                            Adicione-o como VITE_TELEGRAM_BOT_ID no seu arquivo .env.
                        </p>
                    )}
                </div>
            )}

            {!error && !isLoading && (
                <div className="flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" onClick={() => setShowHelp(!showHelp)}>
                    <Info className="w-3 h-3 text-zinc-500" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Ajuda com Login</span>
                </div>
            )}

            {showHelp && !error && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 animate-fade-in">
                    <p className="text-[9px] text-zinc-600 dark:text-zinc-400 font-bold uppercase leading-relaxed mb-2">
                        Como configurar o login:
                    </p>
                    <ul className="text-[8px] text-zinc-500 font-medium uppercase space-y-1 list-disc pl-3">
                        <li>Fale com o @BotFather no Telegram</li>
                        <li>Use o comando /setdomain e digite seu domínio</li>
                        <li>Copie o Bot Token e use apenas os números iniciais como ID</li>
                    </ul>
                </div>
            )}
        </div>
    );
};
