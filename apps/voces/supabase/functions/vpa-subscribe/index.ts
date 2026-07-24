// VPA subscribe — crea una SUSCRIPCIÓN recurrente en MercadoPago (preapproval)
// para la membresía de un especialista. El front primero llama a la RPC
// vpa_start_subscription (autenticado) que crea la sub 'pending' con el precio ya
// descontado; luego pide aquí el link de autorización de tarjeta.
//
// Cobra al TOKEN DE PLATAFORMA (cuenta VOCESPARAELALMA) — la membresía es ingreso
// de Voces, sin split. external_reference = subscription_id → el webhook activa.
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

  // token de plataforma (mismo del ebook) desde el Vault
  const { data: cfg } = await admin.rpc("vpa__payment_config");
  const token = cfg?.vpa_mp_access_token;
  if (!token) return json({ error: "not_configured", note: "MercadoPago aún no configurado en /admin → Pagos" }, 409);

  // datos de la suscripción (solo service_role)
  const { data: sub, error } = await admin.rpc("vpa__subscription_for_payment", { p_sub: subId });
  if (error) return json({ error: error.message }, 500);
  if (!sub) return json({ error: "subscription_not_found" }, 404);
  if (sub.status !== "pending") return json({ error: "not_payable", status: sub.status }, 409);

  const amountCents = Number(sub.amount_cents) || 0;
  if (amountCents <= 0) return json({ error: "zero_amount" }, 400);
  const email = String(sub.buyer_email || "").trim();
  if (!email) return json({ error: "email_required", note: "La suscripción no tiene correo del pagador" }, 400);

  const reason = `Voces para el Alma — ${String(sub.plan_name || "Membresía").slice(0, 200)}`;
  const preapproval = {
    reason,
    external_reference: subId,
    payer_email: email,
    auto_recurring: {
      frequency: Number(sub.frequency_value) || 1,   // 1 mensual · 12 anual
      frequency_type: "months",
      transaction_amount: Math.round(amountCents) / 100,
      currency_id: String(sub.currency || "MXN"),
    },
    back_url: `${SITE}/unete?sub=${subId}`,
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/vpa-mp-webhook`,
    status: "pending",
  };

  const r = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(preapproval),
  });
  const pj = await r.json();
  if (!r.ok) return json({ error: "mp_error", detail: pj?.message || pj }, 502);

  // guardar el id del preapproval en la sub (auditado)
  await admin.rpc("vpa__set_preapproval", { p_sub: subId, p_preapproval_id: String(pj.id || ""), p_status: String(pj.status || "pending") });

  const mode = String(token).startsWith("TEST-") ? "test" : "live";
  return json({
    ok: true, mode,
    preapproval_id: pj.id,
    init_point: pj.init_point,          // MP no expone sandbox_init_point para preapproval
    checkout_url: pj.init_point,
    amount_cents: amountCents,
    currency: preapproval.auto_recurring.currency_id,
  });
});
