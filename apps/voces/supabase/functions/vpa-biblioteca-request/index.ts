// vpa-biblioteca-request — paso 1 del acceso seguro a descargas.
// Recibe {email}. Si ese correo tiene una compra pagada con archivo entregable,
// genera un código OTP de 6 dígitos, lo guarda hasheado y lo manda por Resend.
// Respuesta genérica siempre (no revela si el correo compró) → privacidad.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hasDeliverable(sb: ReturnType<typeof createClient>, email: string) {
  const { data: orders } = await sb.from("app_vpa_order_groups")
    .select("id").in("status", ["paid", "fulfilled"]).ilike("buyer_email", email);
  if (!orders?.length) return false;
  const { data: its } = await sb.from("app_vpa_order_items")
    .select("item_id").in("group_id", orders.map((o: { id: string }) => o.id));
  const offs = [...new Set((its || []).map((i: { item_id: string }) => i.item_id).filter(Boolean))];
  if (!offs.length) return false;
  const { data: dels } = await sb.from("app_vpa_deliverables").select("offering_id").in("offering_id", offs);
  return !!(dels && dels.length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const { email } = await req.json().catch(() => ({}));
  const em = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return json({ error: "bad_email" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  try {
    if (await hasDeliverable(sb, em)) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const hash = await sha256hex(em + ":" + code);
      await sb.from("app_vpa_dl_otp").upsert({
        email: em, code_hash: hash, attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      const { data: cfg } = await sb.rpc("vpa__mailer_config");
      const apiKey = cfg?.vpa_resend_api_key;
      const from = cfg?.vpa_mail_from || "Voces para el Alma <contacto@voces.world>";
      if (apiKey) {
        const html = `<div style="font-family:Georgia,serif;color:#2C2722;background:#F7F2E9;padding:32px">
          <div style="max-width:520px;margin:0 auto;background:#FCFAF4;border-radius:16px;padding:32px;border:1px solid rgba(44,39,34,.12);text-align:center">
          <div style="width:14px;height:14px;border-radius:50%;background:#B68A3E;margin:0 auto 16px;box-shadow:0 0 0 6px rgba(203,161,90,.25),0 0 0 12px rgba(126,144,120,.15)"></div>
          <h2 style="font-weight:400">Tu código de acceso</h2>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#5a5348">Usa este código para acceder a tus descargas en Voces para el Alma. Vence en 10 minutos.</p>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:38px;font-weight:700;letter-spacing:.18em;color:#2C2722;margin:18px 0">${code}</div>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8a8378">Si no fuiste tú, ignora este correo.<br>Voces para el Alma · <a href="https://voces.flowme.one" style="color:#B68A3E">voces.flowme.one</a></p>
          </div></div>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [em], subject: "Tu código de acceso · Voces para el Alma", html }),
        });
      }
    }
  } catch (_) { /* respuesta genérica igual */ }

  return json({ ok: true });
});
