
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextProps {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

    const showToast = useCallback((msg: string, type: ToastType = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in-down w-auto max-w-[90%] pointer-events-none">
                    <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${
                        toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400 shadow-red-500/30' :
                        toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400 shadow-emerald-500/30' :
                        'bg-slate-800/90 text-white border-slate-700 shadow-black/30'
                    }`}>
                        <span className="material-icons-round text-xl">
                            {toast.type === 'error' ? 'error_outline' : 
                             toast.type === 'success' ? 'check_circle' : 'info'}
                        </span>
                        <span className="font-bold text-sm tracking-wide">{toast.msg}</span>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};
