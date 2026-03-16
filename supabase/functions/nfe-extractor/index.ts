import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: nfe-extractor
 * Isolated module — does NOT modify telegram-notification or any existing function.
 *
 * Receives: { chaveAcesso: string (44 digits) }
 * Decodes the embedded data from the key and sends a Telegram message
 * with all extracted info + public SEFAZ consultation link.
 */

const ESTADOS: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
  '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
  '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
  '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
  '52': 'GO', '53': 'DF',
};

function decodeChave(chave: string) {
  // NF-e chave structure (44 digits):
  // [0..1]   cUF       - state code (2)
  // [2..7]   AAMM      - year/month (6)
  // [8..21]  CNPJ      - emitter CNPJ (14)
  // [22..23] mod       - model 55=NF-e, 65=NFC-e (2)
  // [24..26] serie     - series (3)
  // [27..35] nNF       - invoice number (9)
  // [36]     tpEmis    - emission type (1)
  // [37..44] cNF+cDV   - random code + check digit (9)
  if (!chave || chave.length !== 44) return null;

  const cUF = chave.slice(0, 2);
  const aamm = chave.slice(2, 8);
  const cnpj = chave.slice(8, 22);
  const mod = chave.slice(22, 24);
  const serie = chave.slice(24, 27);
  const nNF = chave.slice(27, 36);
  const tpEmis = chave.slice(36, 37);

  const ano = '20' + aamm.slice(0, 2);
  const mes = aamm.slice(2, 4);
  const mesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mes) - 1] || mes;

  const cnpjFormatted = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const estado = ESTADOS[cUF] || cUF;
  const modelo = mod === '55' ? 'NF-e (55)' : mod === '65' ? 'NFC-e (65)' : `Modelo ${mod}`;
  const tipoEmissao = tpEmis === '1' ? 'Normal' : tpEmis === '9' ? 'Contingência' : `Tipo ${tpEmis}`;
  const numeroNF = parseInt(nNF).toString(); // strip leading zeros

  return { estado, cnpjFormatted, mes: `${mesNome}/${ano}`, modelo, serie, numeroNF, tipoEmissao };
}

// (Simplified for performance, similar to danfe-telegram)
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { chaveAcesso, userId } = await req.json();
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error("Configuração incompleta");

    const chave = chaveAcesso.replace(/\D/g, '');
    const decoded = decodeChave(chave);
    const sefazLink = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${chave}`;

    const lines = [
      `<b>📄 NF-e Detectada — ${decoded?.numeroNF || 'Nova'}</b>`,
      `---------------------------`,
      `🔑 <b>Chave:</b> <code>${chave.slice(0,11)}...${chave.slice(33,44)}</code>`,
    ];

    if (decoded) {
      lines.push(`🏭 <b>Emitente:</b> ${decoded.cnpjFormatted}`);
      lines.push(`🏢 <b>Estado:</b> ${decoded.estado}`);
      lines.push(`📅 <b>Emissão:</b> ${decoded.mes}`);
    }

    lines.push(`---------------------------`);
    lines.push(`🔗 <a href="${sefazLink}">Consultar SEFAZ</a>`);

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: lines.join('\n'),
        parse_mode: "HTML",
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ success: true, chave, decoded, sefazLink, message_id: result.result?.message_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
