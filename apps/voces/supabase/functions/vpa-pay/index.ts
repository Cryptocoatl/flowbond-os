// VPA pay v5 — crea una preferencia de MercadoPago (Checkout Pro) para una orden.
//
// POR QUÉ v5: el `marketplace_fee` (split por autor) hace que MercadoPago OCULTE
// métodos de pago en Checkout Pro. Verificado 2026-07-25 comparando dos preferencias
// sobre el MISMO collector: con split ofrece MENOS métodos que sin split. Por eso
// había compradores que llegaban al checkout y no podían pagar con su tarjeta.
//
// Ahora el comprador ELIGE el riel y la fn enruta:
//   method="card"  → cuenta del AUTOR + marketplace_fee (split automático, probado OK)
//   method="other" → cuenta PLATAFORMA (VOCESPARAELALMA) SIN split → los 11 métodos
//                    quedan disponibles (OXXO, SPEI/CLABE, saldo MP y cualquier tarjeta).
//                    La parte del autor queda registrada en order_items.specialist_cents
//                    y se le deposita desde Voces (payout manual).
// El riel "transferencia directa" no pasa por aquí: es vpa_declare_transfer (RPC).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://voces.world";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const orderId = String(body.order_id || "").trim();
  if (!UUID.test(orderId)) return json({ error: "invalid order" }, 400);
  // riel: "card" (split del autor) | "other" (plataforma, todos los métodos)
  const method = String(body.method || "card").trim() === "other" ? "other" : "card";

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: cfg } = await admin.rpc("vpa__payment_config");
  const token = cfg?.vpa_mp_access_token;
  if (!token) return json({ error: "not_configured", note: "MercadoPago aún no configurado en /admin → Pagos" }, 409);

  const { data: order, error } = await admin.rpc("vpa__order_for_payment", { p_order: orderId });
  if (error) return json({ error: error.message }, 500);
  if (!order) return json({ error: "order_not_found" }, 404);
  if (order.status !== "awaiting_payment") return json({ error: "order_not_payable", status: order.status }, 409);
  const totalCents = Number(order.total_cents) || 0;
  if (totalCents <= 0) return json({ error: "zero_total" }, 400);

  // MARKETPLACE (sólo riel "card"): si la orden es de UN autor conectado y la app está
  // configurada, se cobra a la cuenta del AUTOR y Voces retiene su comisión.
  // En el riel "other" NUNCA se aplica split — ese es justo el punto: sin split
  // MercadoPago muestra todos los métodos de pago.
  let payToken = token;
  let split = false, splitFee = 0, splitPct = 0, splitSpecialist = "", authorName = "";
  try {
    const { data: specialist } = await admin.rpc("vpa__order_specialist", { p_order: orderId });
    if (specialist) {
      const { data: sname } = await admin.from("app_vpa_specialists").select("name").eq("id", specialist).maybeSingle();
      authorName = sname?.name || "";
      if (method === "card") {
        const { data: ready } = await admin.rpc("vpa_mp_marketplace_ready");
        const { data: authorTok } = await admin.rpc("vpa__mp_author_token", { p_specialist: specialist });
        if (ready && authorTok) {
          const { data: pct } = await admin.rpc("vpa_mp_commission_pct", { p_specialist: specialist });
          payToken = authorTok;
          splitPct = Number(pct) || 0;
          splitFee = Math.round(totalCents * splitPct / 100) / 100; // en MXN (unidad, no cents)
          split = true;
          splitSpecialist = String(specialist);
        }
      } else {
        splitSpecialist = String(specialist);
      }
    }
  } catch (_) { /* fallback a plataforma */ }

  // Una línea = total exacto de la orden (evita descuadres por descuento).
  const items = Array.isArray((order as Record<string, unknown>).items) ? (order as Record<string, { title?: string }[]>).items : [];
  const itemTitle = order.is_test
    ? "Voces — pago de prueba"
    : items.length === 1 ? String(items[0].title || "Voces para el Alma").slice(0, 250)
    : items.length > 1 ? `${String(items[0].title || "").slice(0, 200)} + ${items.length - 1} más`
    : "Voces para el Alma";
  const itemDesc = authorName ? `${authorName} · Voces para el Alma` : "Voces para el Alma";
  const pref = {
    items: [{
      id: orderId,
      title: itemTitle,
      description: itemDesc,
      quantity: 1,
      currency_id: "MXN",
      unit_price: Math.round(totalCents) / 100,
    }],
    payer: order.buyer_email ? { email: order.buyer_email } : undefined,
    external_reference: orderId,
    back_urls: {
      success: `${SITE}/?paid=${orderId}`,
      failure: `${SITE}/?pay=failed&order=${orderId}`,
      pending: `${SITE}/?pay=pending&order=${orderId}`,
    },
    auto_return: "approved",
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/vpa-mp-webhook`,
    statement_descriptor: "VOCES ALMA",
    // Sin exclusiones + meses sin intereses habilitados: máxima aceptación de tarjeta.
    payment_methods: {
      excluded_payment_methods: [],
      excluded_payment_types: [],
      installments: 12,
    },
    metadata: { order_id: orderId, is_test: !!order.is_test, split, specialist: splitSpecialist, rail: method },
    ...(split ? { marketplace_fee: splitFee } : {}),
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${payToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(pref),
  });
  const pj = await r.json();
  if (!r.ok) return json({ error: "mp_error", detail: pj?.message || pj }, 502);

  await admin.rpc("vpa__order_set_preference", { p_order: orderId, p_pref: String(pj.id) });
  await admin.rpc("vpa__order_set_method", { p_order: orderId, p_method: method });
  const mode = String(payToken).startsWith("TEST-") ? "test" : "live";
  return json({
    ok: true, mode, rail: method,
    preference_id: pj.id,
    init_point: pj.init_point,
    sandbox_init_point: pj.sandbox_init_point,
    checkout_url: mode === "test" ? (pj.sandbox_init_point || pj.init_point) : pj.init_point,
    total_cents: totalCents,
    split, marketplace_fee: split ? splitFee : undefined, commission_pct: split ? splitPct : undefined,
  });
});
