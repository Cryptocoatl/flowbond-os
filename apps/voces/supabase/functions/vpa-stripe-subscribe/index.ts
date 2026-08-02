// VPA stripe subscribe — crea una Checkout Session de Stripe (modo suscripción)
// para la membresía de un especialista.
//
// POR QUÉ EXISTE: MercadoPago rechaza los cargos recurrentes con
// `cc_rejected_high_risk` (antifraude). Verificado 2026-07-25: las 6 suscripciones
// reales quedaron 'pending', ninguna activa. La API de preapproval de MP sólo acepta
// payer_email, así que no hay forma de mejorar el score desde el código.
// Stripe Checkout además trae Apple Pay / Google Pay y tarjetas internacionales sin
// configuración extra (se habilitan en el dashboard de Stripe).
//
// Las membresías cobran a la cuenta de VOCES — sin Connect ni split (decisión Steph).
// El precio ya viene descontado desde vpa_start_subscription.
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
  const subId = String(body.subscription_id || "").trim();
  if (!UUID.test(subId)) return json({ error: "invalid subscription" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: cfg } = await admin.rpc("vpa__payment_config");
  const sk = cfg?.vpa_stripe_secret_key;
  if (!sk) return json({ error: "not_configured", note: "Stripe aún no configurado en /admin → Pagos" }, 409);

  const { data: sub, error } = await admin.rpc("vpa__subscription_for_payment", { p_sub: subId });
  if (error) return json({ error: error.message }, 500);
  if (!sub) return json({ error: "subscription_not_found" }, 404);
  if (sub.status !== "pending") return json({ error: "not_payable", status: sub.status }, 409);

  const amountCents = Number(sub.amount_cents) || 0;
  if (amountCents <= 0) return json({ error: "zero_amount" }, 400);
  const email = String(sub.buyer_email || "").trim();
  if (!email) return json({ error: "email_required" }, 400);

  const yearly = String(sub.period || "") === "yearly";
  const planName = String(sub.plan_name || "Membresía").slice(0, 200);

  // Stripe habla form-encoded, con llaves anidadas por corchetes.
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("client_reference_id", subId);
  form.set("customer_email", email);
  form.set("locale", "es");
  form.set("success_url", `${SITE}/unete?sub=${subId}&stripe=ok`);
  form.set("cancel_url", `${SITE}/unete?sub=${subId}&stripe=cancel`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", String(sub.currency || "MXN").toLowerCase());
  form.set("line_items[0][price_data][unit_amount]", String(Math.round(amountCents)));
  form.set("line_items[0][price_data][recurring][interval]", yearly ? "year" : "month");
  form.set("line_items[0][price_data][product_data][name]", `Voces para el Alma — ${planName}`);
  form.set("subscription_data[metadata][subscription_id]", subId);
  form.set("metadata[subscription_id]", subId);

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `vpa-sub-${subId}`,
    },
    body: form.toString(),
  });
  const sj = await r.json();
  if (!r.ok) return json({ error: "stripe_error", detail: sj?.error?.message || sj }, 502);

  await admin.rpc("vpa__set_stripe_sub", {
    p_sub: subId, p_session: String(sj.id || ""),
    p_customer: String(sj.customer || ""), p_status: "checkout_created",
  });

  const mode = String(sk).includes("_test_") ? "test" : "live";
  return json({
    ok: true, mode, provider: "stripe",
    session_id: sj.id,
    checkout_url: sj.url,
    amount_cents: amountCents,
    currency: String(sub.currency || "MXN"),
  });
});
