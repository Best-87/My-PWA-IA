import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: danfe-telegram
 * Módulo independiente para enviar la DANFE procesada a Telegram.
 */

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = "-1003750898188"; // El chat específico requerido

Deno.serve(async (req) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    if (!TELEGRAM_BOT_TOKEN) {
        return new Response(JSON.stringify({ error: "Telegram não configurado" }), { status: 500 });
    }

    try {
        const bodyText = await req.text();
        const data = JSON.parse(bodyText);
        const { message, imageBase64 } = data;

        if (!message) {
            return new Response(JSON.stringify({ error: "Message missing" }), { status: 400 });
        }

        const telegramBase = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

        let telegramResult;

        // Si hay foto, la mandamos por multipart
        if (imageBase64) {
            const boundary = "----WebKitFormBoundaryDANFE" + Math.random().toString(36).substring(2);
            let buf = "";

            buf += `--${boundary}\r\n`;
            buf += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;
            buf += `--${boundary}\r\n`;
            buf += `Content-Disposition: form-data; name="caption"\r\n\r\n${message}\r\n`;
            buf += `--${boundary}\r\n`;
            buf += `Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;

            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const binary = atob(base64Data);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }

            buf += `--${boundary}\r\n`;
            buf += `Content-Disposition: form-data; name="photo"; filename="danfe.jpg"\r\n`;
            buf += `Content-Type: image/jpeg\r\n\r\n`;

            const encoder = new TextEncoder();
            const top = encoder.encode(buf);
            const bottom = encoder.encode(`\r\n--${boundary}--\r\n`);

            const combined = new Uint8Array(top.length + array.length + bottom.length);
            combined.set(top, 0);
            combined.set(array, top.length);
            combined.set(bottom, top.length + array.length);

            const res = await fetch(`${telegramBase}/sendPhoto`, {
                method: "POST",
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`
                },
                body: combined,
            });
            telegramResult = await res.json();
        } else {
            // Text only
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
            console.error("Telegram error:", telegramResult);
            return new Response(JSON.stringify({ error: "Falha ao enviar para Telegram", detail: telegramResult }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Habilitamos CORS en la Edge Function para poder ser llamada desde el front local o remoto
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        });
    } catch (err: any) {
        console.error("danfe-telegram error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
