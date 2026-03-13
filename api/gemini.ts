export const config = {
  runtime: 'edge',
};
// Add max duration to prevent 504 timeouts on Vercel
export const maxDuration = 60;

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

    // Format prompt for REST API directly (pure fetch is more reliable on Edge than heavy SDKs)
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

    const defaultInstruction = `Eres un experto de élite en logística, pesaje industrial y aseguramiento de calidad (QA) para Conferente Pro.
        
TU ENTRENAMIENTO INCLUYE:
1. ANÁLISIS DE IMÁGENES: Eres capaz de identificar etiquetas de alimentos, códigos de lote, fechas de vencimiento (formato DD/MM/AAAA) e condições de almacenamiento.
2. PRECISIÓN OCR: Extraes dados numéricos como pesos de tara, pesos netos e quantidades com precisão cirúrgica.
3. CONTEXTO LOGÍSTICO: Entiendes la diferencia entre peso bruto, tara y neto.
4. DETECCIÓN DE RIESGOS: Identificas produtos próximos a vencer ou problemas de temperatura.

MODO DE OPERAÇÃO:
- Sé analítico e profissional.
- Extrai EXATAMENTE no formato solicitado pelo prompt e responda estritamente o JSON quando pedido.`;

    const instructionsText = systemInstruction || defaultInstruction;

    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: instructionsText }] }
        }),
    });

    if (!fetchResponse.ok) {
        const errText = await fetchResponse.text();
        throw new Error(`Google API falhou com status ${fetchResponse.status}: ${errText}`);
    }

    const data = await fetchResponse.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ text: textResult }), {
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
