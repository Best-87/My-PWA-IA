
/**
 * Servicio frontend para interactuar con Gemini a través del Proxy de Vercel.
 * La comunicación es segura ya que la API Key reside únicamente en el servidor.
 */
import { CustomChatSession } from '../types';

export const generateGeminiContent = async (prompt: any, systemInstruction?: string) => {
    // Local development fallback: if we're on localhost and have the key, call directly
    // since the /api proxy might not be running in a standard 'npm run dev' (Vite)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const localKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (isLocal && localKey) {
        try {
            const model = 'gemini-2.5-flash'; // Good for OCR and fast
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${localKey}`;

            // Format prompt for direct API call (REST API expects snake_case: inline_data, mime_type)
            const promptParts = prompt.parts || (Array.isArray(prompt) ? prompt : [{ text: prompt }]);
            const contents = [{
                parts: promptParts.map((p: any) => {
                    if (p.inlineData) {
                        return {
                            inline_data: {
                                mime_type: p.inlineData.mimeType || 'image/jpeg',
                                data: p.inlineData.data
                            }
                        };
                    }
                    return p;
                })
            }];

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
            // If direct call fails, fall back to proxy (maybe they are using 'vercel dev')
        } catch (e) {
            console.warn("Direct Gemini call failed, falling back to proxy...", e);
        }
    }

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, systemInstruction }),
        });

        if (!response.ok) {
            let errorText = `Erro de conexão (${response.status})`;
            try {
                const errorData = await response.json();
                errorText = (errorData.error || errorText) + (errorData.details ? `: ${errorData.details}` : '');
            } catch {
                if (response.status === 504) {
                    errorText = 'Tempo limite atingido ao processar a imagem. Tente novamente ou use uma foto com menor resolução.';
                }
            }
            throw new Error(errorText);
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
