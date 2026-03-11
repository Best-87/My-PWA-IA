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

    // Format timestamp
    const ts = record.timestamp ? new Date(record.timestamp) : new Date();
    const dateStr = ts.toLocaleDateString('pt-BR');
    const timeStr = ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Full-detail message (WhatsApp format)
    const message = [
      `*📋 Relatório de Pesagem - Conferente Pro*`,
      `---------------------------`,
      `📅 *Data:* ${dateStr} às ${timeStr}`,
      `---------------------------`,
      `🏭 *Fornecedor:* ${record.supplier || 'N/A'}`,
      `📦 *Produto:* ${record.product || 'N/A'}`,
      record.cnpj         ? `🆔 *CNPJ:* ${record.cnpj}` : null,
      record.note_number  ? `🧾 *Nº Nota:* ${record.note_number}` : null,
      record.batch        ? `🔢 *Lote:* ${record.batch}` : null,
      record.expiration_date ? `📅 *Validade:* ${record.expiration_date}` : null,
      `---------------------------`,
      `⚖️ *Peso Bruto:* ${(record.gross_weight || 0).toFixed(3)} kg`,
      `📄 *Peso Nota:* ${(record.note_weight || 0).toFixed(3)} kg`,
      `📦 *Tara:* ${(record.tara_total || 0).toFixed(3)} kg (x${record.boxes?.qty || 0})`,
      `✅ *Peso Líquido:* *${(record.net_weight || 0).toFixed(3)} kg*`,
      `---------------------------`,
      `📊 *Diferença:* *${diffSign}${diff.toFixed(3)} kg*`,
      `🤖 *Status:* ${statusText}`,
      record.ai_analysis ? `` : null,
      record.ai_analysis ? `📝 *Obs IA:* ${record.ai_analysis}` : null,
    ]
      .filter(line => line !== null)
      .join('\n');

    const telegramBase = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Check if a photo (evidence) exists as a base64 string
    const hasPhoto = record.evidence && typeof record.evidence === 'string' && record.evidence.startsWith('data:image');

    if (hasPhoto) {
      // --- Send photo with caption ---
      // Convert base64 to Blob
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
      // Telegram caption limit is 1024 chars
      form.append('caption', message.slice(0, 1024));
      form.append('parse_mode', 'Markdown');

      await fetch(`${telegramBase}/sendPhoto`, { method: "POST", body: form });
    } else {
      // --- Send text-only message ---
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
