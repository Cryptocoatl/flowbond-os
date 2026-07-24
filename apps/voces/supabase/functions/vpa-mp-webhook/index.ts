// VPA MercadoPago webhook — MP notifica aquí (verify_jwt=false). NO confiamos en
// el cuerpo: re-consultamos el objeto en la API de MP con nuestro token y sólo
// entonces actuamos (idempotente). Así un POST falso no puede marcar nada.
//
// Maneja tres tipos de notificación:
//   · payment            → pago de una ORDEN de tienda (comportamiento original)
//   · preapproval        → alta / pausa / cancelación de una SUSCRIPCIÓN
//   · authorized_payment → un cobro RECURRENTE de una suscripción
import { createClient } from "jsr:@supabase/supabase-js@2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  // MP envía el id por query (?type=..&data.id=) o en el body JSON.
  const url = new URL(req.url);
  let type = url.searchParams.get("type") || url.searchParams.get("topic") || "";
  let objId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  if (!objId || !type) {
    try {
      const b = await req.json();
      type = type || b?.type || b?.topic || "";
      objId = objId || b?.data?.id || b?.id || "";
    } catch { /* sin body */ }
  }
  const t = String(type || "").toLowerCase();
  if (!objId) return ok({ ignored: "no id" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: cfg } = await admin.rpc("vpa__payment_config");
  const token = cfg?.vpa_mp_access_token;
  if (!token) return ok({ error: "not_configured" });

  // ============ SUSCRIPCIÓN: alta / cambio de estado (preapproval) ============
  // OJO: se atrapan las suscripciones ANTES del check de "payment" porque
  // subscription_authorized_payment contiene la palabra "payment".
  const isPreapproval = t === "preapproval" || t === "subscription_preapproval";
  const isAuthPayment = /authorized_payment/.test(t); // subscription_authorized_payment
  if (isPreapproval) {
    const rr = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(String(objId))}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!rr.ok) return ok({ error: "preapproval_lookup_failed" });
    const pa = await rr.json();
    const ref = String(pa?.external_reference || "");
    const { data: res } = await admin.rpc("vpa__subscription_event_by_system", {
      p_ref: UUID.test(ref) ? ref : null,
      p_preapproval_id: String(pa?.id || objId),
      p_kind: "preapproval",
      p_mp_status: String(pa?.status || ""),
    });
    return ok({ ok: true, kind: "preapproval", preapproval: String(pa?.id || objId), status: pa?.status, result: res });
  }

  // ============ SUSCRIPCIÓN: cobro recurrente (authorized_payment) ============
  if (isAuthPayment) {
    const rr = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(String(objId))}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!rr.ok) return ok({ error: "authorized_payment_lookup_failed" });
    const ap = await rr.json();
    const status = String(ap?.payment?.status || ap?.status || "");
    const { data: res } = await admin.rpc("vpa__subscription_event_by_system", {
      p_ref: null,
      p_preapproval_id: String(ap?.preapproval_id || ""),
      p_kind: "authorized_payment",
      p_mp_status: status,
    });
    return ok({ ok: true, kind: "authorized_payment", preapproval: ap?.preapproval_id || null, status, result: res });
  }

  // ============ PAGO de una ORDEN de tienda (comportamiento original) ============
  if (t && !/payment/i.test(t)) return ok({ ignored: type });

  // re-consultar el pago (fuente de verdad). Candidatos: token de plataforma +
  // tokens de autores conectados (los pagos de marketplace viven en la cuenta del autor).
  const { data: authorTokens } = await admin.rpc("vpa__mp_connected_tokens");
  const candidates = [token, ...(((authorTokens as string[]) || []))];
  let pay: Record<string, unknown> | null = null;
  for (const tk of candidates) {
    const rr = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(objId))}`, {
      headers: { Authorization: `Bearer ${tk}` },
    });
    if (rr.ok) { pay = await rr.json(); break; }
  }
  if (!pay) return ok({ error: "mp_lookup_failed" });
  const orderId = String(pay?.external_reference || "");
  if (pay?.status === "approved" && UUID.test(orderId)) {
    await admin.rpc("vpa__order_paid_by_system", { p_order: orderId, p_payment_id: String(pay.id) });
    // Correo automático de entrega si la orden tiene archivo descargable (idempotente).
    try {
      const { data: og } = await admin.from("app_vpa_order_groups").select("buyer_email").eq("id", orderId).maybeSingle();
      const buyer = (og?.buyer_email || "").trim();
      if (buyer) {
        const { data: its } = await admin.from("app_vpa_order_items").select("item_id").eq("group_id", orderId);
        const offs = [...new Set(((its || []) as { item_id: string }[]).map((i) => i.item_id).filter(Boolean))];
        let hasDel = false;
        if (offs.length) {
          const { data: dels } = await admin.from("app_vpa_deliverables").select("offering_id").in("offering_id", offs);
          hasDel = !!(dels && dels.length);
        }
        if (hasDel) {
          const { data: dup } = await admin.from("app_vpa_email_outbox")
            .select("id").eq("template", "ebook_ready").contains("payload", { order_id: orderId }).limit(1);
          if (!dup || !dup.length) {
            await admin.from("app_vpa_email_outbox").insert({
              to_email: buyer, template: "ebook_ready", status: "queued",
              payload: { order_id: orderId, email: buyer },
            });
          }
        }
      }
    } catch (_) { /* la entrega en pantalla no depende del correo */ }
    return ok({ ok: true, order: orderId, marked: "paid" });
  }
  return ok({ ok: true, status: pay?.status, order: orderId || null });
});
