
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerateContentResponse } from "@google/genai";
import { createChatSession, sendMessageStream } from '../services/geminiService';
import { Message, CustomChatSession } from '../types';
import { trackEvent } from '../services/analyticsService';

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'init', role: 'model', text: 'Bienvenido a Conferente. Soy tu consultor de inteligencia artificial. ¿Qué datos necesitas analizar o qué consulta estratégica tienes hoy?', timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState<CustomChatSession | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Chat Session
    useEffect(() => {
        if (!navigator.onLine) return; // Skip if offline
        try {
            const session = createChatSession("Eres el consultor senior de Conferente Pro. Tu entrenamiento incluye análisis logístico avanzado, gestión de inventarios y optimización de pesaje. Ayuda al usuario a interpretar datos de etiquetas, resolver dudas sobre proveedores y mejorar la precisión de los registros.");
            setChatSession(session);
        } catch (error) {
            console.error("Failed to init chat session", error);
            trackEvent('error_chat_init', { error: String(error) });
        }
    }, []);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        // CHECK OFFLINE
        if (!navigator.onLine) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "⚠️ No hay conexión a internet. El asistente no puede responder.",
                timestamp: Date.now()
            }]);
            return;
        }

        // Track interaction event
        trackEvent('message_sent', {
            length: input.length,
            timestamp: Date.now()
        });

        const userMsgId = Date.now().toString();
        const userMessage: Message = {
            id: userMsgId,
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const modelMsgId = (Date.now() + 1).toString();
        // Optimistic update for model message
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() }]);

        try {
            // Re-init session if missing (e.g. came online later)
            let session = chatSession;
            if (!session) {
                session = createChatSession();
                setChatSession(session);
            }

            const streamResult = await sendMessageStream(session, userMessage.text);

            let fullText = '';
            for await (const chunk of streamResult) {
                const content = chunk as GenerateContentResponse;
                const textChunk = content.text || '';
                fullText += textChunk;

                setMessages(prev => prev.map(msg =>
                    msg.id === modelMsgId ? { ...msg, text: fullText } : msg
                ));
            }
            // Track successful response
            trackEvent('message_response_received', { length: fullText.length });
        } catch (error) {
            console.error("Error receiving stream", error);
            trackEvent('error_message_send', { error: String(error) });
            setMessages(prev => prev.map(msg =>
                msg.id === modelMsgId ? { ...msg, text: "Lo siento, ha ocurrido un error en la conexión. Por favor verifica tu red e intenta nuevamente." } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    }, [input, chatSession, isLoading]);

    return (
        <div className="flex flex-col h-[650px] w-full max-w-5xl mx-auto bg-zinc-900 border-2 border-zinc-700 rounded-none overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b-2 border-zinc-800 bg-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none border-2 border-blue-500 bg-zinc-800 flex items-center justify-center text-blue-500">
                        <span className="font-bold text-lg">C</span>
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-xs uppercase tracking-widest">Sesión Activa</h2>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-white/40 text-xs">{navigator.onLine ? 'Conectado a Gemini 3' : 'Sin Conexión'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-none px-4 py-3 text-sm leading-6 border-2 ${msg.role === 'user'
                                ? 'bg-blue-600 border-blue-700 text-white'
                                : 'bg-zinc-800 border-zinc-700 text-gray-200'
                                }`}
                        >
                            <p className="whitespace-pre-wrap font-mono uppercase text-xs">{msg.text}</p>
                            {msg.role === 'model' && msg.text === '' && (
                                <div className="flex space-x-1 h-5 items-center">
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-900 border-t-2 border-zinc-800">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-3 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="INGRESE CONSULTA..."
                        className="flex-1 bg-zinc-800 border-2 border-zinc-700 rounded-none px-4 py-3 text-white text-xs font-mono uppercase tracking-widest placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-2 border-blue-800 text-white w-12 h-12 rounded-none transition-colors flex items-center justify-center shrink-0"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <span className="material-icons-round text-xl">send</span>
                        )}
                    </button>
                </form>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-white/20">Conferente AI puede cometer errores. Verifica la información importante.</p>
                </div>
            </div>
        </div>
    );
};
