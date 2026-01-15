import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { createChatSession, sendMessageStream } from '../services/geminiService';
import { Message } from '../types';
import { trackEvent } from '../services/analyticsService';

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'init', role: 'model', text: 'Bienvenido a Conferente. Soy tu consultor de inteligencia artificial. ¿Qué datos necesitas analizar o qué consulta estratégica tienes hoy?', timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Chat Session
    useEffect(() => {
        try {
            const session = createChatSession();
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
        if (!input.trim() || !chatSession || isLoading) return;

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
            const streamResult = await sendMessageStream(chatSession, userMessage.text);
            
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
        <div className="flex flex-col h-[650px] w-full max-w-5xl mx-auto bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="font-display font-bold text-white text-lg">C</span>
                    </div>
                    <div>
                        <h2 className="text-white font-display font-medium text-sm">Sesión Activa</h2>
                        <div className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-white/40 text-xs">Conectado a Gemini 3</span>
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
                            className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm leading-7 shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-primary text-white rounded-br-sm' 
                                    : 'bg-white/10 text-gray-100 rounded-bl-sm border border-white/5'
                            }`}
                        >
                            <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
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
            <div className="p-4 bg-black/40 border-t border-white/5">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-3 max-w-4xl mx-auto">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu consulta o datos a analizar..." 
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all font-sans"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-primary hover:bg-[#6a11cb] disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
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