// vpa-mp-connect — callback OAuth de MercadoPago Marketplace.
// El autor autoriza a Voces → MP redirige aquí con ?code&state.
// Intercambiamos el code por el token del AUTOR y lo guardamos cifrado.
// verify_jwt=false: lo llama MercadoPago (sin JWT); la seguridad es el state efímero + el code.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://voces.flowme.one";
const REDIRECT = "https://fgsrcxxccdjqyrpkitmk.supabase.co/functions/v1/vpa-mp-connect";

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
     <div style="font-family:Georgia,serif;background:#F7F2E9;color:#2C2722;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px">
     <div style="max-width:440px"><h2 style="font-weight:400">${title}</h2><p style="font-family:Helvetica,Arial,sans-serif;color:#5a5348">${body}</p>
     <a href="${SITE}/mi-voz" style="display:inline-block;margin-top:16px;background:#B01E2E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-family:Helvetica,Arial,sans-serif">Volver a mi panel</a></div></div>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return page("Falta información", "El enlace de conexión está incompleto. Inténtalo de nuevo desde tu panel.");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const { data: specialist } = await sb.rpc("vpa__mp_consume_state", { p_token: state });
    if (!specialist) return page("Enlace vencido", "Este enlace de conexión ya se usó o expiró. Genera uno nuevo desde tu panel.");

    const { data: cfg } = await sb.rpc("vpa__marketplace_config");
    const clientId = cfg?.vpa_mp_client_id, clientSecret = cfg?.vpa_mp_client_secret;
    if (!clientId || !clientSecret) return page("Marketplace sin configurar", "La app de Marketplace aún no está conectada. Avísale al equipo de Voces.");

    const r = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
    });
    const t = await r.json();
    if (!r.ok || !t.access_token) return page("No se pudo conectar", `MercadoPago rechazó la conexión (${t.message || r.status}). Inténtalo de nuevo.`);

    await sb.rpc("vpa__mp_save_connection", {
      p_specialist: specialist,
      p_mp_user_id: String(t.user_id ?? ""),
      p_access_token: t.access_token,
      p_refresh_token: t.refresh_token ?? null,
      p_public_key: t.public_key ?? null,
      p_expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
      p_scope: t.scope ?? null,
    });
    return page("¡Cuenta conectada! ✨", "Tu MercadoPago quedó conectado a Voces. Ya puedes recibir tus pagos directo a tu cuenta; Voces retiene solo su comisión acordada.");
  } catch (e) {
    return page("Algo salió mal", `Error al conectar: ${String(e)}. Inténtalo de nuevo.`);
  }
});
