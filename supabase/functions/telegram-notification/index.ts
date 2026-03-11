import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Supabase Edge Function: telegram-notification
 * Handles:
 *   - action: 'insert' (default) → Send message, save message_id back to DB
 *   - action: 'delete'           → Delete message from Telegram chat
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response(JSON.stringify({ error: "Configuração incompleta" }), { status: 500 });
  }

  try {
    const payload = await req.json();
    const telegramBase = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // --- Handle DELETE action ---
    if (payload.action === 'delete' && payload.telegram_message_id) {
      await fetch(`${telegramBase}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_id: payload.telegram_message_id,
        }),
      });
      return new Response(JSON.stringify({ success: true, action: 'deleted' }), { status: 200 });
    }

    // --- Handle INSERT action (default) ---
    const record = payload.record;
    if (!record) return new Response("No record", { status: 400 });

    const diff = (record.net_weight || 0) - (record.note_weight || 0);
    const isOk = Math.abs(diff) <= 0.2;
    const statusText = isOk ? "Validado ✅" : "Revisão Necessária ⚠️";
    const diffSign = diff >= 0 ? "+" : "";

    // timestamp is bigint (milliseconds)
    const tsMs = record.timestamp ? Number(record.timestamp) : Date.now();
    const ts = new Date(tsMs);
    const dateStr = ts.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const timeStr = ts.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    // Build message lines
    const lines: string[] = [
      `*📋 Relatório de Pesagem - Conferente Pro*`,
      `---------------------------`,
      `📅 *Data:* ${dateStr} às ${timeStr}`,
    ];

    if (record.store)      lines.push(`🏪 *Loja/Unidade:* ${record.store}`);
    if (record.conferente) lines.push(`👤 *Conferente:* ${record.conferente}`);

    lines.push(`---------------------------`);
    lines.push(`🏭 *Fornecedor:* ${record.supplier || 'N/A'}`);
    lines.push(`📦 *Produto:* ${record.product || 'N/A'}`);

    if (record.cnpj)            lines.push(`🆔 *CNPJ:* ${record.cnpj}`);
    if (record.note_number)     lines.push(`🧾 *Nº Nota:* ${record.note_number}`);
    if (record.batch)           lines.push(`🔢 *Lote:* ${record.batch}`);
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

    // Check if photo exists
    const hasPhoto = record.evidence &&
      typeof record.evidence === 'string' &&
      record.evidence.startsWith('data:image');

    let sentMessageId: number | null = null;

    if (hasPhoto) {
      const base64Data = record.evidence.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const form = new FormData();
      form.append('chat_id', TELEGRAM_CHAT_ID);
      form.append('photo', blob, 'evidencia.jpg');
      form.append('caption', message.slice(0, 1024));
      form.append('parse_mode', 'Markdown');

      const res = await fetch(`${telegramBase}/sendPhoto`, { method: "POST", body: form });
      const result = await res.json();
      sentMessageId = result?.result?.message_id ?? null;
    } else {
      const res = await fetch(`${telegramBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }),
      });
      const result = await res.json();
      sentMessageId = result?.result?.message_id ?? null;
    }

    // Save telegram_message_id back to DB so we can delete it later
    if (sentMessageId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from('weighing_records')
        .update({ telegram_message_id: sentMessageId })
        .eq('id', record.id);
    }

    return new Response(JSON.stringify({ success: true, telegram_message_id: sentMessageId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(error.message, { status: 500 });
  }
});
