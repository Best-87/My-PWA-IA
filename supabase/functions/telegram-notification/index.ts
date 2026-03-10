import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: telegram-notification
 * 
 * triggered by: Database Webhook (INSERT on pesajes table)
 * goal: Send record details to a Telegram chat
 */

Deno.serve(async (req) => {
  // 1. Get secrets from environment
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response(
      JSON.stringify({ error: "Missing Telegram configuration (Token or Chat ID)" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 2. Parse the webhook payload
    // Supabase Webhooks send the full record in the 'record' property
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response(
        JSON.stringify({ error: "No record found in payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Construct the message
    // Adjusting to user-requested fields: id, producto, peso, motorista, placa, fecha, hora
    const message = `
📦 *Nuevo Pesaje Registrado*
---------------------------
🆔 *ID:* ${record.id}
🍎 *Producto:* ${record.producto || 'N/A'}
⚖️ *Peso:* ${record.peso || '0'} kg
👤 *Motorista:* ${record.motorista || 'N/A'}
🚛 *Placa:* ${record.placa || 'N/A'}
📅 *Fecha:* ${record.fecha || 'N/A'}
⏰ *Hora:* ${record.hora || 'N/A'}
---------------------------
🚀 _Enviado automáticamente por Supabase_
    `.trim();

    // 4. Send to Telegram API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Telegram API Error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send Telegram message", details: result }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: result.result?.message_id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
