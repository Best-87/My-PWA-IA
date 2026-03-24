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
    productos?: any[];
    proveedor: string | null;
    lote: string | null;
    fechaVencimiento: string | null;
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
       Eres un validador industrial estricto de Notas Fiscales y Etiquetas brasileñas.
       Analiza la imagen y extrae:
       - CNPJ (xx.xxx.xxx/xxxx-xx) del emisor.
       - Peso Bruto Total de la nota.
       - Proveedor (Nombre/Razón Social).
       - Productos: Lista de objetos { "descricao": string, "qtd": num, "peso_unitario": num, "peso_total": num }.
         - Busca patrones como 'CX 26 KG', '10 KG' en la descripción para obtener peso_unitario.
         - peso_total debe ser qtd * peso_unitario.
       - Para ETIQUETAS: Extrae además Lote, Tara (en KG) y Fecha de Vencimiento (DD/MM/AAAA).

       SI ALGO NO ES 100% VISIBLE, PONLO EN NULL. NO LO INVENTES.
       Devuelve JSON: { "cnpj": "...", "pesoBruto": 0.0, "productos": [...], "proveedor": "...", "lote": "...", "fechaVencimiento": "...", "tara": 0.0, "confidence": 0-1 }
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
    
    const productsArr = Array.isArray(llmData.productos) ? llmData.productos : [];
    const productsDesc = productsArr.map((p: any) => typeof p === 'object' ? p.descricao : p).filter(Boolean);

    let result: ExtractedData = {
        cnpj: regexCNPJ,
        pesoBruto: regexWeights.bw || llmData.pesoBruto || null,
        tara: regexWeights.tara || llmData.tara || null,
        productosDesc: productsDesc,
        productos: productsArr,
        proveedor: llmData.proveedor || llmData.fornecedor || null,
        lote: llmData.lote || llmData.batch || null,
        fechaVencimiento: llmData.fechaVencimiento || llmData.validade || null,
        confidence: llmData.confidence || 0.5,
        warnings: llmData.warnings || []
    };

    // 3. CAPA DE INTELIGENCIA DE NEGOCIO (TARAS Y PROVEEDORES DESDE SUPABASE)
    if (result.cnpj || result.proveedor) {
        try {
            // A. Buscar nombre de proveedor si tenemos CNPJ pero no nombre
            if (result.cnpj && !result.proveedor) {
                const { data: provData } = await supabase
                    .from('m_proveedores')
                    .select('nombre')
                    .eq('cnpj', result.cnpj)
                    .single();
                if (provData?.nombre) {
                    result.proveedor = provData.nombre;
                    result.warnings.push(`Fornecedor identificado pelo historial: ${provData.nombre}`);
                }
            }
            
            // B. Buscar CNPJ si tenemos nombre pero no CNPJ (Match por nombre)
            if (!result.cnpj && result.proveedor) {
                const { data: provData } = await supabase
                    .from('m_proveedores')
                    .select('cnpj')
                    .ilike('nombre', `%${result.proveedor}%`)
                    .limit(1)
                    .maybeSingle();
                if (provData?.cnpj) {
                    result.cnpj = provData.cnpj;
                    result.warnings.push(`CNPJ recuperado pelo historial: ${provData.cnpj}`);
                }
            }

            // C. Tara Probabilística (Solo para etiquetas)
            if (documentType === 'ETIQUETA' && result.tara === null && result.cnpj) {
                const { data: taraData } = await supabase
                    .from('vw_tara_probabilistica')
                    .select('tara_mas_frecuente')
                    .eq('cnpj_proveedor', result.cnpj)
                    .single();
                    
                if (taraData?.tara_mas_frecuente) {
                    result.tara = taraData.tara_mas_frecuente;
                    result.warnings.push(`Tara injetada pelo historial (${taraData.tara_mas_frecuente}kg).`);
                }
            }
        } catch(e) {
            console.warn("Error en enriquecimiento de datos ML:", e);
        }
    }

    // 4. Agregador final de alertas
    if (!result.cnpj) result.warnings.push("Falta CNPJ Válido. Origen Desconocido.");
    if (!result.tara && documentType === 'ETIQUETA') result.warnings.push("Tara indefinida. DEBE requerir inserción manual.");

    return result;
}

/**
 * CAPA 4: FEEDBACK LOOP TRIGGER
 * Alimenta la base de datos de aprendizaje basándose en las correcciones del usuario.
 */
export async function feedbackLoopLearnTara(
    cnpj: string | null, 
    supplier: string | null, 
    taraVerificada: number | null, 
    product: string | null
) {
    if(!supabase) return;
    try {
        // 1. Aprender/Actualizar Proveedor (CNPJ <-> Nombre)
        if (cnpj && supplier) {
            await supabase.from('m_proveedores').upsert({
                cnpj: cnpj,
                nombre: supplier.toUpperCase(),
                nivel_confianza: 1.0
            });
        }

        // 2. Aprender Tara histórica
        if (cnpj && taraVerificada && taraVerificada > 0) {
            await supabase.from('historico_aprendizaje_taras').insert({
                cnpj_proveedor: cnpj,
                tara_aplicada: taraVerificada,
                tipo_envase: product ? `CAJA_${product.toUpperCase()}` : 'CAJA_DEFECTO'
            });
        }
    } catch(err) {
        console.error("Feedback Loop Failed: ", err);
    }
}
