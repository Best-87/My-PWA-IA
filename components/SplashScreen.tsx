import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Duration: 2.5s total to appreciate the branding
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onFinish, 700); // Wait for the exit animation
        }, 2500);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#09090b] transition-all duration-700 ease-in-out ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
            
            {/* 1. Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60vh] h-[60vh] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vh] h-[60vh] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
            </div>

            {/* Spacer for vertical centering */}
            <div className="flex-1"></div>

            {/* 2. Main Center Content */}
            <div className="flex flex-col items-center relative z-10 animate-slide-up">
                
                {/* INLINE LOGO (Guarantees no broken image icon) */}
                <div className="w-32 h-32 mb-8 relative drop-shadow-2xl">
                    <svg viewBox="0 0 512 512" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                            </linearGradient>
                            <filter id="splashGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="10" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        {/* Squircle Shape */}
                        <rect x="56" y="56" width="400" height="400" rx="100" fill="url(#splashGrad)" />
                        {/* Checkmark */}
                        <path d="M360 180 L210 360 L140 280" 
                            fill="none" 
                            stroke="white" 
                            strokeWidth="45" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            filter="url(#splashGlow)"
                            className="animate-[dash_1.5s_ease-in-out_forwards]"
                            strokeDasharray="400"
                            strokeDashoffset="400"
                        />
                        {/* Dot */}
                        <circle cx="390" cy="150" r="25" fill="white" className="animate-bounce" style={{animationDelay: '0.8s'}} />
                    </svg>
                    
                    {/* Ring Pulse */}
                    <div className="absolute inset-0 rounded-[2rem] border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                </div>
                
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2 font-sans flex items-center gap-1">
                    Conferente
                    <span className="text-blue-500 animate-pulse">.</span>
                </h1>
                <p className="text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase">Logística Inteligente</p>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* 3. Footer Version Info */}
            <div className="pb-12 text-center relative z-10 animate-fade-in opacity-0" style={{ animation: 'fadeIn 1s ease-out 0.5s forwards' }}>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-1 h-8 bg-gradient-to-b from-transparent to-zinc-800"></div>
                    <span className="text-[10px] font-mono text-zinc-600 font-medium">v1.0.0 Pro</span>
                </div>
            </div>
            
            <style>{`
                @keyframes dash {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </div>
    );
};