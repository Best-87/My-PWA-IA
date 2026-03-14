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

Deno.serve(async (req: any) => {
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
      `<b>📋 Relatório de Pesagem - Conferente Pro</b>`,
      `---------------------------`,
      `📅 <b>Data:</b> ${dateStr} às ${timeStr}`,
    ];

    if (record.store)      lines.push(`🏪 <b>Loja/Unidade:</b> ${record.store}`);
    if (record.conferente) lines.push(`👤 <b>Conferente:</b> ${record.conferente}`);

    lines.push(`---------------------------`);
    lines.push(`🏭 <b>Fornecedor:</b> ${record.supplier || 'N/A'}`);
    lines.push(`📦 <b>Produto:</b> ${record.product || 'N/A'}`);

    if (record.cnpj)            lines.push(`🆔 <b>CNPJ:</b> ${record.cnpj}`);
    if (record.note_number)     lines.push(`🧾 <b>Nº Nota:</b> ${record.note_number}`);
    
    if (record.access_key && record.access_key.length === 44) {
      const sefazLink = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${record.access_key}`;
      lines.push(`🔗 <a href="${sefazLink}">Consultar SEFAZ</a>`);
    }

    if (record.batch)           lines.push(`🔢 <b>Lote:</b> ${record.batch}`);
    if (record.expiration_date) lines.push(`📅 <b>Validade:</b> ${record.expiration_date}`);

    lines.push(
      `---------------------------`,
      `⚖️ <b>Peso Bruto:</b> ${(record.gross_weight || 0).toFixed(3)} kg`,
      `📄 <b>Peso Nota:</b> ${(record.note_weight || 0).toFixed(3)} kg`,
      `📦 <b>Tara:</b> ${(record.tara_total || 0).toFixed(3)} kg (x${record.boxes?.qty || 0})`,
      `✅ <b>Peso Líquido:</b> <b>${(record.net_weight || 0).toFixed(3)} kg</b>`,
      `---------------------------`,
      `📊 <b>Diferença:</b> <b>${diffSign}${diff.toFixed(3)} kg</b>`,
      `🤖 <b>Status:</b> ${statusText}`,
    );

    if (record.ai_analysis) {
      lines.push(``, `📝 <b>Obs IA:</b> ${record.ai_analysis}`);
    }

    const message = lines.join('\n');

    const hasPhoto = record.evidence && typeof record.evidence === 'string';
    const isBase64 = hasPhoto && record.evidence.startsWith('data:image');

    let sentMessageId: number | null = null;
    let telegramResponse: any = null;

    if (hasPhoto) {
      if (isBase64) {
        const base64Data = record.evidence.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/jpeg' });

        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('photo', blob, 'evidencia.jpg');
        form.append('caption', message.slice(0, 1024));
        form.append('parse_mode', 'HTML');

        const res = await fetch(`${telegramBase}/sendPhoto`, { method: "POST", body: form });
        telegramResponse = await res.json();
      } else {
        // Assume it's a URL
        const res = await fetch(`${telegramBase}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            photo: record.evidence,
            caption: message.slice(0, 1024),
            parse_mode: 'HTML'
          }),
        });
        telegramResponse = await res.json();
      }
      sentMessageId = telegramResponse?.result?.message_id ?? null;
    } else {
      const res = await fetch(`${telegramBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
      });
      telegramResponse = await res.json();
      sentMessageId = telegramResponse?.result?.message_id ?? null;
    }

    if (!telegramResponse?.ok) {
       console.error("Telegram API Error:", telegramResponse);
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
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(error.message, { status: 500 });
  }
});
