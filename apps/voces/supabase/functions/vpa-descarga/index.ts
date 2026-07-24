// vpa-descarga — entrega segura de ebooks tras el pago.
// Devuelve un signed URL del PDF privado SÓLO si la orden está pagada y el correo coincide.
// verify_jwt=false: el comprador es anónimo; la seguridad es orden pagada + email match.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const { order, email } = await req.json().catch(() => ({}));
    if (!order || !email) return json({ error: "missing_params" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: og } = await sb
      .from("app_vpa_order_groups")
      .select("id,status,buyer_email")
      .eq("id", order)
      .maybeSingle();

    if (!og) return json({ paid: false, items: [] });
    if (og.status !== "paid" && og.status !== "fulfilled") return json({ paid: false, items: [] });
    if ((og.buyer_email || "").trim().toLowerCase() !== String(email).trim().toLowerCase())
      return json({ paid: true, mismatch: true, items: [] }, 403);

    const { data: items } = await sb
      .from("app_vpa_order_items").select("item_id,title").eq("group_id", order);
    const ids = [...new Set((items || []).map((i) => i.item_id).filter(Boolean))];
    if (!ids.length) return json({ paid: true, items: [] });

    const { data: dels } = await sb
      .from("app_vpa_deliverables").select("offering_id,bucket,path").in("offering_id", ids);

    // Descarga inmediata tras el pago: emitimos un token de 1h y entregamos vía
    // vpa-descarga-file (marca de agua con el correo del comprador). Nunca exponemos
    // una URL firmada cruda del PDF. El correo del sello = el comprador verificado.
    const SITE = Deno.env.get("SUPABASE_URL")!;
    const buyerEmail = (og.buyer_email || String(email)).trim().toLowerCase();
    const out: { title: string; url: string; filename: string }[] = [];
    for (const d of dels || []) {
      const it = (items || []).find((i) => i.item_id === d.offering_id);
      const title = it?.title || "eBook";
      const ext = (d.path.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const filename = (title.normalize("NFD")
        .replace(/[^a-zA-Z0-9 ._-]/g, "").trim().replace(/\s+/g, "-") || "eBook") + "." + ext;
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await sb.from("app_vpa_dl_tokens").insert({
        token, email: buyerEmail, bucket: d.bucket, path: d.path, title,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      out.push({ title, url: `${SITE}/functions/v1/vpa-descarga-file?t=${token}`, filename });
    }
    return json({ paid: true, items: out });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
