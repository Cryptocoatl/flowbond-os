// VPA stripe webhook — recibe los eventos de Stripe y activa/renueva/cancela la
// membresía por el MISMO camino que MercadoPago (vpa__subscription_event_by_system),
// así que puntos, publicación del perfil, redención de código y créditos son idénticos.
//
// verify_jwt=false: la autenticidad se prueba con la FIRMA de Stripe (HMAC del secreto
// de webhook), no con un JWT. Sin firma válida se rechaza — nunca se confía en el body.
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

// Verificación de firma de Stripe: t=<ts>,v1=<hmac sha256 de "<ts>.<payload>">
async function validSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=")).filter((a) => a.length === 2) as [string, string][],
  );
  const ts = parts["t"];
  const sig = parts["v1"];
  if (!ts || !sig) return false;
  // Rechaza repeticiones viejas (5 min de tolerancia).
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${payload}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // Comparación de tiempo constante.
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const raw = await req.text();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: cfg } = await admin.rpc("vpa__payment_config");
  const whsec = cfg?.vpa_stripe_webhook_secret;
  const sk = cfg?.vpa_stripe_secret_key;
  if (!whsec) return json({ error: "not_configured" }, 409);

  const sigHeader = req.headers.get("stripe-signature") || "";
  if (!(await validSignature(raw, sigHeader, whsec))) return json({ error: "bad_signature" }, 401);

  let evt: Record<string, unknown>;
  try { evt = JSON.parse(raw); } catch { return json({ error: "bad json" }, 400); }
  const type = String(evt.type || "");
  const obj = ((evt.data as Record<string, unknown>)?.object ?? {}) as Record<string, unknown>;

  let ref: string | null = null;      // uuid de la suscripción nuestra
  let stripeSub = "";
  let kind = "";
  let status = "";

  if (type === "checkout.session.completed") {
    ref = (obj.client_reference_id as string) || null;
    stripeSub = String(obj.subscription || "");
    kind = "stripe_sub";
    // La sesión completada implica cobro exitoso en modo suscripción.
    status = String(obj.payment_status || "") === "paid" ? "active" : "incomplete";
    if (ref) {
      await admin.rpc("vpa__set_stripe_sub", {
        p_sub: ref, p_session: String(obj.id || ""),
        p_customer: String(obj.customer || ""), p_subscription: stripeSub, p_status: status,
      });
    }
  } else if (type === "invoice.paid" || type === "invoice.payment_succeeded") {
    stripeSub = String(obj.subscription || "");
    ref = ((obj.metadata as Record<string, string>) || {}).subscription_id || null;
    kind = "stripe_invoice";
    status = "paid";
  } else if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    stripeSub = String(obj.id || "");
    ref = ((obj.metadata as Record<string, string>) || {}).subscription_id || null;
    kind = "stripe_sub";
    status = type === "customer.subscription.deleted" ? "canceled" : String(obj.status || "");
  } else {
    return json({ ok: true, ignored: type });
  }

  // Si no vino nuestro uuid en el evento, se resuelve consultando la suscripción en
  // Stripe (fuente de verdad) — nunca se confía en datos del body sin verificar.
  if (!ref && stripeSub && sk) {
    try {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSub}`, {
        headers: { Authorization: `Bearer ${sk}` },
      });
      const sj = await r.json();
      if (r.ok) ref = (sj?.metadata?.subscription_id as string) || null;
    } catch (_) { /* se resolverá por stripe_subscription_id */ }
  }

  const { data, error } = await admin.rpc("vpa__subscription_event_by_system", {
    p_ref: ref, p_preapproval_id: stripeSub, p_kind: kind, p_mp_status: status,
  });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, type, result: data });
});
