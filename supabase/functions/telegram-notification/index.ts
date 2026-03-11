import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: telegram-notification
 * triggered by: Database Webhook (INSERT on weighing_records)
 *
 * Sends a full Telegram message with CNPJ, nota fiscal, and photo when available.
 */

Deno.serve(async (req) => {
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response(JSON.stringify({ error: "Configuração incompleta" }), { status: 500 });
  }

  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) return new Response("No record", { status: 400 });

    const diff = (record.net_weight || 0) - (record.note_weight || 0);
    const isOk = Math.abs(diff) <= 0.2;
    const statusText = isOk ? "Validado ✅" : "Revisão Necessária ⚠️";
    const diffSign = diff >= 0 ? "+" : "";

    // timestamp is stored as bigint (milliseconds), timezone Brazil (UTC-3)
    const tsMs = record.timestamp ? Number(record.timestamp) : Date.now();
    const ts = new Date(tsMs);
    const dateStr = ts.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const timeStr = ts.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    // Build message lines, skipping nulls
    const lines: string[] = [
      `*📋 Relatório de Pesagem - Conferente Pro*`,
      `---------------------------`,
      `📅 *Data:* ${dateStr} às ${timeStr}`,
      `---------------------------`,
      `🏭 *Fornecedor:* ${record.supplier || 'N/A'}`,
      `📦 *Produto:* ${record.product || 'N/A'}`,
    ];

    if (record.cnpj)        lines.push(`🆔 *CNPJ:* ${record.cnpj}`);
    if (record.note_number) lines.push(`🧾 *Nº Nota:* ${record.note_number}`);
    if (record.batch)       lines.push(`🔢 *Lote:* ${record.batch}`);
    if (record.expiration_date) lines.push(`📅 *Validade:* ${record.expiration_date}`);

    lines.push(
      `---------------------------`,
      `⚖️ *Peso Bruto:* ${(record.gross_weight || 0).toFixed(3)} kg`,
      `📄 *Peso Nota:* ${(record.note_weight || 0).toFixed(3)} kg`,
      `📦 *Tara:* ${(record.tara_total || 0).toFixed(3)} kg (x${record.boxes?.qty || 0})`,
      `✅ *Peso Líquido:* *${(record.net_weight || 0).toFixed(3)} kg*`,
      `---------------------------`,
      `📊 *Diferença:* *${diffSign}${diff.toFixed(3)} kg*`,
      `🤖 *Status:* ${statusText}`,
    );

    if (record.ai_analysis) {
      lines.push(``, `📝 *Obs IA:* ${record.ai_analysis}`);
    }

    const message = lines.join('\n');
    const telegramBase = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Check if a photo (evidence) exists as a base64 string
    const hasPhoto = record.evidence &&
      typeof record.evidence === 'string' &&
      record.evidence.startsWith('data:image');

    if (hasPhoto) {
      // Convert base64 to Blob and send via sendPhoto
      const base64Data = record.evidence.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const form = new FormData();
      form.append('chat_id', TELEGRAM_CHAT_ID);
      form.append('photo', blob, 'evidencia.jpg');
      form.append('caption', message.slice(0, 1024)); // Telegram caption limit
      form.append('parse_mode', 'Markdown');

      await fetch(`${telegramBase}/sendPhoto`, { method: "POST", body: form });
    } else {
      // Text-only message
      await fetch(`${telegramBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(error.message, { status: 500 });
  }
});
