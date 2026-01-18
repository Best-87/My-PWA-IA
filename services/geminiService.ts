
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Helper to create a chat session
export const createChatSession = (): Chat => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found in environment (geminiService)");
    
    // Correct initialization: MUST use named parameter { apiKey: string }
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
