
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Helper to create a chat session
export const createChatSession = (): Chat => {
    // Get key from injected window.process or local process.env
    const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
        console.error("Gemini API Key missing in runtime environment");
        throw new Error("Configuración de IA incompleta");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: "Eres 'Conferente', un asistente avanzado de IA especializado en análisis de datos, consultoría estratégica y gestión inteligente de información. Tu tono es profesional, analítico pero accesible. Estás integrado en una PWA diseñada para ayudar a usuarios a tomar decisiones basadas en datos. Cuando presentes datos o conclusiones, usa un formato estructurado y claro.",
        }
    });
};

// Function to send message and get stream
export const sendMessageStream = async (chat: Chat, message: string) => {
    try {
        const result = await chat.sendMessageStream({ message });
        return result;
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        throw error;
    }
};
