import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTelegramHash(data: Record<string, any>, botToken: string): Promise<boolean> {
    const { hash, ...authData } = data;
    const dataCheckString = Object.keys(authData)
        .sort()
        .map(key => `${key}=${authData[key]}`)
        .join('\n');

    const encoder = new TextEncoder();
    
    // Secret Key = SHA256(bot_token)
    const secretKeyBuf = await crypto.subtle.digest("SHA-256", encoder.encode(botToken));
    
    const key = await crypto.subtle.importKey(
        "raw",
        secretKeyBuf,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataCheckString));
    
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === hash;
}

// Generar una contraseña determinística y extremadamente segura a partir del ID y el Token del Bot
async function generateSecurePassword(telegramId: string, botToken: string): Promise<string> {
   const encoder = new TextEncoder();
   const preHash = `${telegramId}::${botToken}::secure_auth_salt_9123`;
   const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(preHash));
   const hashArray = Array.from(new Uint8Array(buffer));
   const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   // Supabase requiere contraseñas válidas. Hex es alfanumérico.
   return `Tg@${hex.substring(0, 30)}!`; 
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        
        if (!payload || !payload.id || !payload.hash) {
            return new Response(JSON.stringify({ error: "Datos de Telegram incompletos." }), { status: 400, headers: corsHeaders });
        }

        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!botToken) {
            return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN no está configurado." }), { status: 500, headers: corsHeaders });
        }

        // 1. Verificar la firma criptográfica de Telegram
        const isValid = await verifyTelegramHash(payload, botToken);
        if (!isValid) {
            return new Response(JSON.stringify({ error: "Firma de Telegram inválida. Posible intento de falsificación." }), { status: 403, headers: corsHeaders });
        }

        // 2. Variables para el usuario Supabase
        const telegramIdStr = payload.id.toString();
        const generatedEmail = `telegram_${telegramIdStr}@mypwaia.app`;
        const generatedPassword = await generateSecurePassword(telegramIdStr, botToken);
        
        const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ');

        // 3. Inicializar el cliente Supabase de Admin
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 4. Buscar si el usuario ya existe en Supabase Auth
        // Nota: Por simplicidad intentaremos hacer login o crearlo
        
        // Intentar crear el usuario. Si falla por "ya existe", lo ignoramos (o actualizamos meta)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: generatedEmail,
            email_confirm: true,
            password: generatedPassword,
            user_metadata: {
                full_name: fullName,
                telegram_id: telegramIdStr,
                username: payload.username || '',
                picture: payload.photo_url || ''
            }
        });

        // Si el usuario ya estaba registrado, UpdateUser no es necesario a menos que queramos
        // refrescar su nombre. createUser devolverá error de que el correo ya está en uso.

        if (createError && !createError.message.includes('already exists')) {
             throw new Error(`Error creando usuario: ${createError.message}`);
        }

        // Retornamos las credenciales auto-generadas al cliente
        // Esto es SEGURO porque solo llegamos aquí si la firma de Telegram era correcta
        // Y la petición ocurre a través de HTTPS.
        return new Response(JSON.stringify({
            success: true,
            email: generatedEmail,
            password: generatedPassword,
            user_data: payload
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });

    } catch (err: any) {
        console.error("Error en telegram-auth:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
