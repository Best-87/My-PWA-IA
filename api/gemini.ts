
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

// Definición estricta de la estructura esperada del cuerpo
interface GeminiRequest {
  prompt: string | any;
  systemInstruction?: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // En Edge Runtime, req.json() devuelve Promise<any>. 
    // Forzamos el tipado a nuestra interfaz para validación estricta.
    const body = (await req.json()) as GeminiRequest;

    const { prompt, systemInstruction } = body;
    const apiKey = process.env.AI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta (API Key)' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'El campo prompt es obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || `Eres un experto de élite en logística, pesaje industrial y aseguramiento de calidad (QA) para Conferente Pro.
        
TU ENTRENAMIENTO INCLUYE:
1. ANÁLISIS DE IMÁGENES: Eres capaz de identificar etiquetas de alimentos, códigos de lote, fechas de vencimiento (formato DD/MM/AAAA) y condiciones de almacenamiento en fotos de etiquetas industriales.
2. PRECISIÓN OCR: Extraes datos numéricos como pesos de tara, pesos netos y cantidades con precisión quirúrgica.
3. CONTEXTO LOGÍSTICO: Entiendes la diferencia entre peso bruto, tara y neto. Sabes que errores en el pesaje afectan la rentabilidad.
4. DETECCIÓN DE RIESGOS: Identificas productos próximos a vencer o condiciones de temperatura inadecuadas (congelado vs refrigerado).

MODO DE OPERACIÓN:
- Sé analítico y profesional.
- Si detectas una discrepancia entre lo que dice la etiqueta y lo que el usuario ingresa, avísale.
- Para análisis de fotos, busca siempre el 'Proveedor', 'Producto', 'Lote', 'Vencimiento' y 'Tara'.`,
      }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error("Gemini API Server Error:", errorMessage);

    return new Response(JSON.stringify({
      error: 'Error procesando la solicitud en el servidor',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
