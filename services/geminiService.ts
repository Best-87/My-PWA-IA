
import { GoogleGenAI, Chat } from "@google/genai";

/**
 * Servicio frontend para interactuar con Gemini.
 * Se utiliza el SDK @google/genai directamente ya que se inyectó process.env.API_KEY en el cliente.
 */

// Initialize the GoogleGenAI instance using the direct API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateGeminiContent = async (prompt: string, systemInstruction?: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || "Eres un asistente profesional.",
            },
        });

        return response.text;
    } catch (error) {
        console.error("Gemini Service Error:", error);
        throw error;
    }
};

/**
 * Creates a new chat session using the gemini-3-flash-preview model.
 */
export const createChatSession = (systemInstruction?: string): Chat => {
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: systemInstruction || "Eres un asistente profesional de logística.",
        },
    });
};

/**
 * Sends a message stream to an existing chat session.
 */
export const sendMessageStream = async (session: Chat, message: string) => {
    return await session.sendMessageStream({ message });
};
