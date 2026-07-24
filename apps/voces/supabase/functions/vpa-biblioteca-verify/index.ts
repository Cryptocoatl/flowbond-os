// vpa-biblioteca-verify — paso 2 del acceso seguro.
// Recibe {email, code}. Valida el OTP (hash, vigencia, intentos). Si es correcto,
// emite un token de descarga de 1 hora por cada archivo comprado y los devuelve.
// El PDF nunca se expone directo: se descarga vía vpa-descarga-file?t=token (con marca de agua).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const { email, code } = await req.json().catch(() => ({}));
  const em = String(email || "").trim().toLowerCase();
  const cd = String(code || "").trim();
  if (!em || !/^\d{6}$/.test(cd)) return json({ error: "bad_input" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: otp } = await sb.from("app_vpa_dl_otp").select("*").eq("email", em).maybeSingle();
  if (!otp) return json({ error: "no_code" }, 400);
  if (new Date(otp.expires_at) < new Date()) { await sb.from("app_vpa_dl_otp").delete().eq("email", em); return json({ error: "expired" }, 400); }
  if ((otp.attempts || 0) >= 5) { await sb.from("app_vpa_dl_otp").delete().eq("email", em); return json({ error: "too_many" }, 429); }
  const hash = await sha256hex(em + ":" + cd);
  if (hash !== otp.code_hash) {
    await sb.from("app_vpa_dl_otp").update({ attempts: (otp.attempts || 0) + 1 }).eq("email", em);
    return json({ error: "bad_code" }, 400);
  }
  await sb.from("app_vpa_dl_otp").delete().eq("email", em);

  // reunir entregables de las órdenes pagadas de este correo
  const { data: orders } = await sb.from("app_vpa_order_groups")
    .select("id").in("status", ["paid", "fulfilled"]).ilike("buyer_email", em);
  const items: { title: string; token: string }[] = [];
  if (orders?.length) {
    const { data: its } = await sb.from("app_vpa_order_items")
      .select("item_id,title").in("group_id", orders.map((o: { id: string }) => o.id));
    const byOff = new Map<string, string>();
    for (const i of its || []) if (i.item_id && !byOff.has(i.item_id)) byOff.set(i.item_id, i.title || "eBook");
    const offs = [...byOff.keys()];
    if (offs.length) {
      const { data: dels } = await sb.from("app_vpa_deliverables")
        .select("offering_id,bucket,path").in("offering_id", offs);
      for (const d of dels || []) {
        const title = byOff.get(d.offering_id) || "eBook";
        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        await sb.from("app_vpa_dl_tokens").insert({
          token, email: em, bucket: d.bucket, path: d.path, title,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
        items.push({ title, token });
      }
    }
  }
  return json({ ok: true, items });
});
