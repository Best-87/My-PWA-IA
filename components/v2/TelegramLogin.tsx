
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

    useEffect(() => {
        if (!containerRef.current) return;
        
        // Limpiar contenedor antes de inyectar
        containerRef.current.innerHTML = '';
        
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', 'ConferentePro_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '15');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.async = true;

        // Callback global para el widget
        (window as any).onTelegramAuth = (user: any) => {
            console.log("DEBUG: Datos recibidos del Widget:", user);
            onAuth(user);
        };

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) containerRef.current.innerHTML = '';
            delete (window as any).onTelegramAuth;
        };
    }, [onAuth]);

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div ref={containerRef} className="min-h-[48px] overflow-hidden flex items-center justify-center">
                {/* El widget se cargará aquí */}
            </div>
            
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-[10px] text-red-600 font-bold uppercase">{error}</span>
                </div>
            )}
        </div>
    );
};
