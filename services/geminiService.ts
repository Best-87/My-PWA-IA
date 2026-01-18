
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Función centralizada para obtener la API KEY de cualquier entorno posible
const getApiKey = (): string => {
    // 1. Intento por reemplazo de Vite (process.env.API_KEY)
    // 2. Intento por objeto global (window.process)
    const key = process.env.API_KEY || (window as any).process?.env?.API_KEY;
    
    if (!key || key === 'undefined' || key === '') {
        console.error("ERUDA DEBUG: API_KEY is missing in current environment");
        return "";
    }
    return key;
};

export const createChatSession = (): Chat => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Configuración de IA incompleta: Falta API Key");
    
    // Inicialización siguiendo estrictamente la documentación de @google/genai
    const ai = new GoogleGenAI({ apiKey });

    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: "Eres 'Conferente', un asistente avanzado de IA especializado en análisis de datos, consultoría estratégica y gestión inteligente de información. Tu tono es profesional, analítico pero accesible. Estás integrado en una PWA diseñada para ayudar a usuarios a tomar decisiones basadas en datos. Cuando presentes datos o conclusiones, usa un formato estructurado y claro.",
        }
    });
};

export const sendMessageStream = async (chat: Chat, message: string) => {
    try {
        const result = await chat.sendMessageStream({ message });
        return result;
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        throw error;
    }
};
