
/**
 * Servicio frontend para interactuar con Gemini a través del Proxy de Vercel.
 * La comunicación es segura ya que la API Key reside únicamente en el servidor.
 */
import { CustomChatSession } from '../types';

export const generateGeminiContent = async (prompt: any, systemInstruction?: string) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, systemInstruction }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en el servidor proxy');
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Gemini Frontend Service Error:", error);
        throw error;
    }
};

/**
 * Mantiene compatibilidad con la interfaz de chat actual.
 * Crea una sesión virtual que guarda las instrucciones del sistema.
 */
export const createChatSession = (systemInstruction?: string): CustomChatSession => {
    return { systemInstruction };
};

/**
 * Envía el mensaje al servidor. 
 * Nota: El streaming se simplifica a una respuesta única para asegurar compatibilidad total con Edge Functions.
 */
export const sendMessageStream = async (session: CustomChatSession, message: string) => {
    const text = await generateGeminiContent(message, session.systemInstruction);

    // Generador asíncrono para mantener compatibilidad con el bucle 'for await' en ChatInterface.tsx
    async function* generator() {
        yield { text };
    }
    return generator();
};
