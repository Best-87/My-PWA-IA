import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: telegram-notification
 * 
 * triggered by: Database Webhook (INSERT on weighing_records table)
 * goal: Send record details to Telegram with WhatsApp-style formatting
 */

Deno.serve(async (req) => {
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response(JSON.stringify({ error: "Configuração incompleta" }), { status: 500 });
  }

  try {
    const payload = await req.json();
    const record = payload.record; // This is the 'weighing_records' row

    if (!record) return new Response("No record", { status: 400 });

    const diff = (record.net_weight || 0) - (record.note_weight || 0);
    const isOk = Math.abs(diff) <= 0.2;
    const statusText = isOk ? "Validado ✅" : "Revisão Necessária ⚠️";
    const diffSign = diff >= 0 ? "+" : "";

    // Exact format from WhatsApp Report (Portuguese)
    const message = `
*Relatório de Pesagem - Conferente Pro*
---------------------------
🏭 *Fornecedor:* ${record.supplier || 'N/A'}
📦 *Produto:* ${record.product || 'N/A'}
${record.batch ? `🔢 *Lote:* ${record.batch}` : ''}
${record.expiration_date ? `📅 *Validade:* ${record.expiration_date}` : ''}
---------------------------
⚖️ *Peso Bruto:* ${(record.gross_weight || 0).toFixed(3)} kg
📦 *Tara:* ${(record.tara_total || 0).toFixed(3)} kg (x${record.boxes?.qty || 0})
✅ *Peso Líquido:* *${(record.net_weight || 0).toFixed(3)} kg*
---------------------------
📊 *Diferença:* *${diffSign}${diff.toFixed(3)} kg*
🤖 *Status:* ${statusText}

${record.ai_analysis ? `📝 *Obs IA:* ${record.ai_analysis}` : ''}
    `.trim();

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});
