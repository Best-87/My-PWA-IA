import { supabase } from './supabaseService';
import { generateGeminiContent } from './geminiService';

/**
 * DATATYPES
 */
export interface ExtractedData {
    cnpj: string | null;
    pesoBruto: number | null;
    tara: number | null;
    productosDesc: string[];
    confidence: number;
    warnings: string[];
}

/**
 * CAPA 1: EXTRACCIÓN DETERMINÍSTICA (REGEX)
 * Jamás adivinar. Extraer mediante patrones exactos matemáticos.
 */
function extractCnpjDeterminista(text: string): string | null {
    const rx = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
    const m = text.match(rx);
    return m ? m[0] : null;
}

function extractWeightsDeterminista(text: string): { bw: number | null, tara: number | null } {
    // Regex avanzado para encontrar Kg cerca de "Tara" o "Bruto"
    const taraMatch = text.match(/TARA\s*[:\-]?\s*(\d+[,.]\d+)\s*(KG|G)/i);
    const brutoMatch = text.match(/BRUTO\s*[:\-]?\s*(\d+[,.]\d+)\s*(KG|G)/i);
    return {
        tara: taraMatch ? parseFloat(taraMatch[1].replace(',', '.')) : null,
        bw: brutoMatch ? parseFloat(brutoMatch[1].replace(',', '.')) : null
    };
}

/**
 * CAPA 2 & 3: LLM PARSER + SUPABASE CROSS-VALIDATION
 * Función incremental. Se puede usar side-by-side con NFScanner actual.
 */
export async function processDocumentHybrid(
    imageBase64: string, 
    documentType: 'NF' | 'ETIQUETA'
): Promise<ExtractedData> {
    
    // 1. LLM Extraction (Capa Cognitiva Limitada)
    const systemPrompt = `
       Eres un validador industrial estricto. Analiza la imagen.
       Extrae CNPJ (xx.xxx.xxx/xxxx-xx), Peso_Bruto, Tara y Nombres de Producto.
       SI ALGO NO ES 100% VISIBLE, PONLO EN NULL. NO LO INVENTES.
       Devuelve JSON: { "cnpj": "...", "pesoBruto": 0.0, "tara": 0.0, "productos": ["..."], "confidence": 0-1, "warnings": [] }
    `;
    
    // Llamada segura a Vercel Edge 
    const aiRaw = await generateGeminiContent(
        [{ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }],
        systemPrompt
    );

    let llmData: any = {};
    try {
        const cleanJSON = aiRaw.replace(/```json/g, '').replace(/```/g, '');
        llmData = JSON.parse(cleanJSON);
    } catch(e) { /* Si la IA Halucina en formato, caer al fallback */ }

    // 2. Combinación Híbrida (El Determinismo mata a la Halucinación)
    // Extraigo texto crudo asumiendo que el LLM o OCR nativo lo dio
    const regexCNPJ = extractCnpjDeterminista(aiRaw) || llmData.cnpj || null;
    const regexWeights = extractWeightsDeterminista(aiRaw);
    
    let result: ExtractedData = {
        cnpj: regexCNPJ,
        pesoBruto: regexWeights.bw || llmData.pesoBruto || null,
        tara: regexWeights.tara || llmData.tara || null,
        productosDesc: llmData.productos || [],
        confidence: llmData.confidence || 0.5,
        warnings: llmData.warnings || []
    };

    // 3. CAPA DE INTELIGENCIA DE NEGOCIO (TARAS AUTOCONTINUAS DESDE SUPABASE)
    if (documentType === 'ETIQUETA' && result.tara === null && result.cnpj) {
        // La etiqueta estaba rota y la IA no supo la TARA.
        // Consultamos la vista de Machine Learning basada en el Feedback Humano
        try {
            const { data } = await supabase
                .from('vw_tara_probabilistica')
                .select('tara_mas_frecuente')
                .eq('cnpj_proveedor', result.cnpj)
                .single();
                
            if (data?.tara_mas_frecuente) {
                result.tara = data.tara_mas_frecuente;
                result.warnings.push(`Tara inyectada estadísticamente (${data.tara_mas_frecuente}kg) guiada por el histórico del Proveedor.`);
            }
        } catch(e) {
            console.warn("No se encontró histórico para Auto-Tara ML", e);
        }
    }

    // 4. Agregador final de alertas
    if (!result.cnpj) result.warnings.push("Falta CNPJ Válido. Origen Desconocido.");
    if (!result.tara && documentType === 'ETIQUETA') result.warnings.push("Tara indefinida. DEBE requerir inserción manual del operario.");

    return result;
}

/**
 * CAPA 4: FEEDBACK LOOP TRIGGER
 * Esta función debe llamarse CADA VEZ que el usuario empiece "Guardar y Nuevo".
 * Alimenta la base de datos que usa el Paso 3.
 */
export async function feedbackLoopLearnTara(cnpj: string, taraVerificadaHumanamente: number) {
    if(!supabase) return;
    try {
        await supabase.from('historico_aprendizaje_taras').insert({
            cnpj_proveedor: cnpj,
            tara_aplicada: taraVerificadaHumanamente,
            tipo_envase: 'CAJA_DEFECTO' // Se puede afinar luego añadiendo tipo
        });
    } catch(err) {
        console.error("Feedback Loop Failed: ", err)
    }
}
