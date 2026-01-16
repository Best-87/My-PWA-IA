import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

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
            icon: 'check_circle',
            bg: 'bg-emerald-50/90 dark:bg-emerald-900/90',
            border: 'border-emerald-200 dark:border-emerald-800',
            text: 'text-emerald-800 dark:text-emerald-100',
            iconColor: 'text-emerald-500 dark:text-emerald-400'
        },
        error: {
            icon: 'error',
            bg: 'bg-red-50/90 dark:bg-red-900/90',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-800 dark:text-red-100',
            iconColor: 'text-red-500 dark:text-red-400'
        },
        warning: {
            icon: 'warning',
            bg: 'bg-amber-50/90 dark:bg-amber-900/90',
            border: 'border-amber-200 dark:border-amber-800',
            text: 'text-amber-800 dark:text-amber-100',
            iconColor: 'text-amber-500 dark:text-amber-400'
        },
        info: {
            icon: 'info',
            bg: 'bg-white/90 dark:bg-zinc-800/90',
            border: 'border-zinc-200 dark:border-zinc-700',
            text: 'text-zinc-800 dark:text-zinc-100',
            iconColor: 'text-blue-500 dark:text-blue-400'
        }
    };

    const currentStyle = styles[toast.type];

    return (
        <div 
            className={`
                pointer-events-auto flex flex-col p-3 rounded-2xl border shadow-lg backdrop-blur-md max-w-sm w-full transition-all duration-300 transform
                ${currentStyle.bg} ${currentStyle.border}
                ${isExiting ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-slide-down'}
            `}
            role="alert"
        >
            {/* Header style imitating iOS/Android Notifications */}
            <div className="flex justify-between items-center mb-1.5 opacity-60 px-1">
                <div className="flex items-center gap-1.5">
                    <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center ${currentStyle.iconColor} bg-current/10`}>
                        <span className="material-icons-round text-[10px] text-current">scale</span>
                    </div>
                    <span className={`text-[10px] uppercase font-black tracking-widest ${currentStyle.text}`}>Conferente</span>
                </div>
                <span className={`text-[9px] font-medium ${currentStyle.text}`}>Ahora</span>
            </div>

            {/* Content Body */}
            <div className="flex items-start gap-3 pl-1 relative">
                <span className={`material-icons-round text-xl shrink-0 mt-0.5 ${currentStyle.iconColor}`}>
                    {currentStyle.icon}
                </span>
                
                <div className="flex-1 pt-0.5">
                    <p className={`text-sm font-bold leading-snug ${currentStyle.text}`}>
                        {toast.msg}
                    </p>
                </div>

                <button 
                    onClick={handleClose}
                    className={`shrink-0 -mr-1 -mt-1 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${currentStyle.text} opacity-60 hover:opacity-100`}
                >
                    <span className="material-icons-round text-base">close</span>
                </button>
            </div>
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