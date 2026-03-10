import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
    id: string;
    msg: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextProps {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, toast.duration || 4000);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300);
    };

    const styles = {
        success: {
            icon: <CheckCircle2 className="w-4 h-4" />,
            bg: 'bg-emerald-50/95 dark:bg-emerald-950/90',
            border: 'border-emerald-200/50 dark:border-emerald-800/50',
            text: 'text-emerald-900 dark:text-emerald-50',
            accent: 'bg-emerald-500',
            iconColor: 'text-emerald-500'
        },
        error: {
            icon: <AlertCircle className="w-4 h-4" />,
            bg: 'bg-red-50/95 dark:bg-red-950/90',
            border: 'border-red-200/50 dark:border-red-800/50',
            text: 'text-red-900 dark:text-red-50',
            accent: 'bg-red-500',
            iconColor: 'text-red-500'
        },
        warning: {
            icon: <AlertTriangle className="w-4 h-4" />,
            bg: 'bg-amber-50/95 dark:bg-amber-950/90',
            border: 'border-amber-200/50 dark:border-amber-800/50',
            text: 'text-amber-900 dark:text-amber-50',
            accent: 'bg-amber-500',
            iconColor: 'text-amber-500'
        },
        info: {
            icon: <Info className="w-4 h-4" />,
            bg: 'bg-white/95 dark:bg-zinc-900/90',
            border: 'border-zinc-200/50 dark:border-zinc-800/50',
            text: 'text-zinc-900 dark:text-zinc-50',
            accent: 'bg-blue-500',
            iconColor: 'text-blue-500'
        }
    };

    const currentStyle = styles[toast.type];

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[1.5rem] border shadow-2xl backdrop-blur-xl max-w-[90vw] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${currentStyle.bg} ${currentStyle.border}
                ${isExiting ? 'opacity-0 -translate-y-4 scale-90' : 'opacity-100 translate-y-0 scale-100 animate-slide-down'}
            `}
            role="alert"
        >
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentStyle.bg} border ${currentStyle.border} shadow-sm ${currentStyle.iconColor}`}>
                {currentStyle.icon}
            </div>

            <div className="flex-1 min-w-0 pr-2">
                <p className={`text-xs font-black tracking-tight leading-tight uppercase ${currentStyle.text}`}>
                    {toast.msg}
                </p>
            </div>

            <button
                onClick={handleClose}
                className={`shrink-0 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${currentStyle.text} opacity-30 hover:opacity-100 active:scale-90`}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((msg: string, type: ToastType = 'info', duration = 4000) => {
        const id = Date.now().toString() + Math.random().toString();
        setToasts(prev => {
            const updated = [...prev, { id, msg, type, duration }];
            if (updated.length > 3) return updated.slice(updated.length - 3);
            return updated;
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}
            <div className="fixed top-16 left-0 right-0 z-[160] flex flex-col items-center gap-2 px-4 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};