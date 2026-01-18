
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt, systemInstruction } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta (API Key)' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Ejecutamos la generación de contenido en el servidor
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: typeof prompt === 'string' ? prompt : prompt, // Maneja strings o estructuras complejas
      config: {
        systemInstruction: systemInstruction || "Eres un asistente profesional de logística.",
      },
    });

    return new Response(JSON.stringify({ text: response.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Gemini API Server Error:", error);
    return new Response(JSON.stringify({ error: 'Error procesando la solicitud en el servidor' }), { status: 500 });
  }
}
