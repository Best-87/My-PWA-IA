import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: danfe-telegram
 * Módulo independiente para enviar la DANFE procesada a Telegram.
 */

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = "-1003750898188"; // El chat específico requerido

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

    if (!TELEGRAM_BOT_TOKEN) {
        return new Response(JSON.stringify({ error: "Telegram não configurado" }), { status: 500, headers: corsHeaders });
    }

    try {
        const data = await req.json();
        const { message, imageBase64 } = data;

        if (!message) {
            return new Response(JSON.stringify({ error: "Message missing" }), { status: 400 });
        }

        const telegramBase = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

        let telegramResult;

        if (imageBase64) {
            // Decodificamos la imagen base64
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'image/jpeg' });

            // Usamos FormData nativo de Deno (más robusto)
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('caption', message.slice(0, 1024)); // Telegram caption limit
            formData.append('parse_mode', 'HTML');
            formData.append('photo', blob, 'capture.jpg');

            const res = await fetch(`${telegramBase}/sendPhoto`, {
                method: "POST",
                body: formData,
            });
            telegramResult = await res.json();
        } else {
            // Mensaje de solo texto
            const res = await fetch(`${telegramBase}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: "HTML",
                }),
            });
            telegramResult = await res.json();
        }

        if (!telegramResult.ok) {
            console.error("Telegram API response error:", telegramResult);
            return new Response(JSON.stringify({ error: "Erro na API do Telegram", detail: telegramResult }), { 
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ success: true, message_id: telegramResult.result?.message_id }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("danfe-telegram caught error:", err);
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
