// vpa-payout — ejecuta el pago a una voz por el riel que ella conectó (solo super_admin).
//
// Rieles automáticos (API):   paypal · wise
// Rieles manuales (se marcan): payoneer · dolarapp/ARQ · usdc · clabe · bank_intl · mercadopago · credit
//   -> para éstos la función devuelve las INSTRUCCIONES de envío; Mónica manda el dinero
//      desde su banco/wallet y confirma con "marcar pagado" en /admin.
//
// El split ya viene congelado en app_vpa_order_items; aquí sólo se mueve el saldo acumulado
// en app_vpa_earnings (status 'paying') hacia afuera, convertido con las tasas verificadas.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

const money = (cents: number) => (cents / 100).toFixed(2);

// Monedas sin decimales: mandar "1234.00" a PayPal en JPY/CLP/COP es un error de la API.
const ZERO_DECIMAL = new Set(["JPY","KRW","CLP","COP","PYG","VND","ISK","HUF","TWD","XAF","XOF","RWF","UGX","VUV","KMF","DJF","GNF","MGA"]);
const fmtAmount = (n: number, ccy: string) =>
  ZERO_DECIMAL.has(ccy.toUpperCase()) ? String(Math.round(n)) : n.toFixed(2);

// Importe y moneda REALES del envío: el saldo vive en MXN y se convierte con las tasas
// verificadas (base USD) a la moneda que la voz eligió. Si no hay tasa fresca, no se
// inventa nada: se paga en MXN y que el proveedor haga su conversión.
function payAmount(p: any): { amount: string; currency: string } {
  const ccy = String(p.fx_ok ? (p.pay_currency || p.currency) : p.currency || "MXN").toUpperCase();
  const raw = p.fx_ok && p.pay_amount ? Number(p.pay_amount) : p.amount_cents / 100;
  return { amount: fmtAmount(raw, ccy), currency: ccy };
}

// ---------------------------------------------------------------- PayPal ---
async function paypalToken(id: string, secret: string, base: string) {
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`paypal auth ${r.status}`);
  return (await r.json()).access_token as string;
}

async function payWithPayPal(p: any, cfg: any, mode: string) {
  const id = cfg?.vpa_paypal_client_id, secret = cfg?.vpa_paypal_secret;
  if (!id || !secret) return { ok: false, not_configured: "paypal" };
  if (!p.email) return { ok: false, error: "la voz no tiene correo de PayPal" };

  const base = mode === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
  const token = await paypalToken(id, secret, base);
  const { amount, currency } = payAmount(p);

  const r = await fetch(`${base}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      // idempotencia: el mismo payout nunca se envía dos veces
      "PayPal-Request-Id": `vpa-${p.id}`,
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `vpa-${p.id}`,
        email_subject: "Recibiste tu pago de Voces para el Alma",
        email_message: `Tu parte de las ventas en Voces para el Alma: ${amount} ${currency}.`,
      },
      items: [{
        recipient_type: "EMAIL",
        receiver: p.email,
        amount: { value: amount, currency },
        note: "Voces para el Alma — liquidación de ventas",
        sender_item_id: p.id,
      }],
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, error: body?.message || body?.name || `paypal ${r.status}` };
  }
  return {
    ok: true,
    // PayPal acepta el lote y lo procesa async -> 'processing' hasta el webhook/consulta.
    status: "processing",
    ref: body?.batch_header?.payout_batch_id,
    amount: Number(amount),
    currency,
  };
}

// ------------------------------------------------------------------ Wise ---
// Flujo Wise: quote -> recipient account -> transfer -> fund desde el balance.
// Aquí NO convertimos nosotros: Wise cotiza a tipo medio real y esa cotización manda.
async function payWithWise(p: any, cfg: any, mode: string) {
  const token = cfg?.vpa_wise_api_token, profile = cfg?.vpa_wise_profile_id;
  if (!token || !profile) return { ok: false, not_configured: "wise" };

  const base = mode === "sandbox"
    ? "https://api.sandbox.transferwise.tech"
    : "https://api.transferwise.com";
  const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
  const target = String(p.currency_target || "MXN").toUpperCase();

  // 1) cotización (origen MXN, que es la moneda en la que se acumula el saldo)
  const qr = await fetch(`${base}/v3/profiles/${profile}/quotes`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      sourceCurrency: p.currency || "MXN",
      targetCurrency: target,
      sourceAmount: Number(money(p.amount_cents)),
      payOut: "BALANCE",
    }),
  });
  const quote = await qr.json().catch(() => ({}));
  if (!qr.ok) return { ok: false, error: quote?.errors?.[0]?.message || `wise quote ${qr.status}` };

  // 2) destinatario: si ya tenemos su id lo reusamos, si no lo creamos por email
  let accountId = p.account_id;
  if (!accountId) {
    if (!p.email) return { ok: false, error: "la voz no tiene correo ni ID de destinatario en Wise" };
    const ar = await fetch(`${base}/v1/accounts`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        currency: target,
        type: "email",
        profile: Number(profile),
        accountHolderName: p.holder_name || p.specialist_name,
        details: { email: p.email },
      }),
    });
    const acct = await ar.json().catch(() => ({}));
    if (!ar.ok) return { ok: false, error: acct?.errors?.[0]?.message || `wise recipient ${ar.status}` };
    accountId = acct?.id;
  }

  // 3) transferencia (customerTransactionId = idempotencia)
  const tr = await fetch(`${base}/v1/transfers`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      targetAccount: accountId,
      quoteUuid: quote?.id,
      customerTransactionId: p.id,
      details: { reference: "Voces", transferPurpose: "verification.transfers.purpose.pay.bills" },
    }),
  });
  const transfer = await tr.json().catch(() => ({}));
  if (!tr.ok) return { ok: false, error: transfer?.errors?.[0]?.message || `wise transfer ${tr.status}` };

  // 4) fondear desde el balance de Wise
  const fr = await fetch(`${base}/v3/profiles/${profile}/transfers/${transfer?.id}/payments`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ type: "BALANCE" }),
  });
  const funded = await fr.json().catch(() => ({}));
  if (!fr.ok) {
    // La transferencia existe pero no se pudo fondear: no la damos por pagada.
    return {
      ok: false,
      error: funded?.errors?.[0]?.message || `wise funding ${fr.status} (transferencia ${transfer?.id} creada sin fondear)`,
    };
  }
  return {
    ok: true,
    status: "processing",
    ref: String(transfer?.id),
    amount: quote?.targetAmount,
    currency: target,
  };
}

// ---------------------------------------------------------------- manual ---
// Qué token exactamente. Las filas viejas (anteriores a la regla dura de
// token/red) no traen `asset` y todas eran USDC: ese es el default seguro.
const cryptoAsset = (dest: any) => String(dest.asset || "USDC").toUpperCase();
// El aviso de token/red y la comisión de la red vienen ya redactados de la BD
// (vpa__crypto_network_note), así que la regla vive en un solo lugar.
function cryptoWarn(dest: any) {
  const parts = [
    dest.asset_warning ||
      `Envía EXACTAMENTE ${cryptoAsset(dest)} en la red ${String(dest.chain || "?").toUpperCase()}. Token equivocado o red equivocada = dinero perdido.`,
    dest.network_note,
  ].filter(Boolean);
  return parts.length ? " " + parts.join(" ") : "";
}

function manualInstructions(p: any, dest: any) {
  const base = `$${money(p.amount_cents)} ${p.currency || "MXN"}`;
  const t = payAmount(p);
  // Si la voz cobra en otra moneda, se dice el importe convertido Y el de origen.
  const amount = (t.currency === (p.currency || "MXN"))
    ? base
    : `${t.amount} ${t.currency} (equivalente a ${base}, tipo de cambio ${Number(p.fx_rate).toFixed(4)})`;
  switch (p.kind) {
    case "dolarapp": {
      // DolarApp/ARQ no tiene API: se le paga a su CLABE (SPEI, en pesos) o a su
      // dirección USDC (dólares). Primero lo que de verdad sirve para enviar; el
      // tag/correo sólo si no dio ninguna de las dos.
      if (dest.clabe) {
        return `Transfiere ${amount} por SPEI a la CLABE de DolarApp ${dest.clabe}, a nombre de ${dest.holder_name || p.specialist_name}.`;
      }
      if (dest.wallet_address) {
        return `Envía ${amount} en ${cryptoAsset(dest)} por la red ${String(dest.chain || "").toUpperCase()} a ${dest.wallet_address} (DolarApp/ARQ de ${p.specialist_name}).${cryptoWarn(dest)} Cuando lo mandes, pega el hash en «Confirmar con el hash».`;
      }
      const to = dest.account_id || dest.email;
      return `Envía ${amount} por DolarApp/ARQ a ${to ? `«${to}»` : "su cuenta"} (${p.specialist_name}).`;
    }
    case "payoneer": {
      // Payoneer no se puede automatizar sin partnership aprobada: se le transfiere a su
      // cuenta receptora (USD routing+cuenta · EUR IBAN+BIC · GBP sort code+cuenta).
      const via = dest.iban
        ? `IBAN ${dest.iban}${dest.swift ? `, BIC ${dest.swift}` : ""}`
        : `cuenta ${dest.account_number}${dest.routing ? `, routing/sort code ${dest.routing}` : ""}${dest.swift ? `, SWIFT ${dest.swift}` : ""}`;
      return `Transfiere ${amount} a la cuenta receptora de Payoneer de ${dest.holder_name || p.specialist_name}: ${via}${dest.bank_name ? ` (${dest.bank_name})` : ""}. El nombre del titular tiene que ir EXACTO o Payoneer rechaza el depósito.${dest.email ? ` Si Voces llega a abrir su propia cuenta Payoneer, se le puede pagar directo a ${dest.email}, sin costo de transferencia.` : ""}`;
    }
    case "usdc":
      return `Envía ${amount} en ${cryptoAsset(dest)} por la red ${String(dest.chain || "").toUpperCase()} a ${dest.wallet_address}.${cryptoWarn(dest)}`;
    case "clabe":
      return `Transfiere ${amount} por SPEI a la CLABE ${dest.clabe} (${dest.bank_name || "banco"}), a nombre de ${dest.holder_name || p.specialist_name}.`;
    case "bank_intl":
      return `Transferencia internacional de ${amount} a ${dest.holder_name || p.specialist_name}, cuenta ${dest.iban || dest.account_number}, SWIFT ${dest.swift || dest.routing || "—"}, país ${dest.country}.`;
    case "mercadopago":
      return `Envía ${amount} por MercadoPago al correo ${dest.email}.`;
    case "credit":
      return `Esta voz eligió dejar su saldo como crédito en Voces. No hay dinero que enviar: sólo confirma para registrarlo.`;
    default:
      return `Envía ${amount} a ${p.specialist_name}.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // 1) sólo super_admin
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: role } = await caller.rpc("vpa_my_role");
    if (role !== "super_admin") return json({ error: "forbidden" }, 403);

    const { payout } = await req.json().catch(() => ({}));
    if (!payout) return json({ error: "falta el pago" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: p } = await admin.rpc("vpa__payout_for_execution", { p_id: payout });
    if (!p) return json({ error: "pago no encontrado" }, 404);
    if (p.status === "paid") return json({ ok: true, already: true });
    if (p.status === "canceled") return json({ error: "este pago fue cancelado" }, 400);

    const { data: cfg } = await admin.rpc("vpa__payment_config");
    // El modo vive en settings (vpa_payout_providers_status exige auth.uid(), que es null
    // bajo service_role) — se lee directo para no caer siempre en 'live' por error.
    const { data: setRows } = await admin
      .from("app_vpa_settings").select("key,value")
      .in("key", ["payouts_paypal", "payouts_wise"]);
    const modeOf = (k: string) =>
      (setRows || []).find((r: any) => r.key === k)?.value?.mode || "live";

    // rieles manuales: devolvemos instrucciones, no movemos dinero
    if (p.provider === "manual" || p.kind === "mercadopago" || p.kind === "credit") {
      const t = payAmount(p);
      return json({
        ok: true, manual: true, kind: p.kind,
        amount_cents: p.amount_cents, currency: p.currency,
        pay_amount: t.amount, pay_currency: t.currency,
        fx_rate: p.fx_rate, fx_ok: p.fx_ok,
        instructions: manualInstructions(p, p),
      });
    }

    let res: any;
    if (p.kind === "paypal") {
      res = await payWithPayPal(p, cfg, modeOf("payouts_paypal"));
    } else if (p.kind === "wise") {
      res = await payWithWise(p, cfg, modeOf("payouts_wise"));
    } else {
      return json({ error: `riel no soportado: ${p.kind}` }, 400);
    }

    if (res.not_configured) {
      return json({
        ok: false, not_configured: res.not_configured,
        note: `Falta conectar ${res.not_configured} en /admin → Pagos. Mientras tanto puedes pagarle a mano y usar "marcar pagado".`,
      });
    }
    if (!res.ok) {
      await admin.rpc("vpa__payout_result", { p_id: payout, p_status: "failed", p_error: res.error });
      return json({ ok: false, error: res.error });
    }

    await admin.rpc("vpa__payout_result", {
      p_id: payout, p_status: res.status, p_ref: res.ref,
      p_amount: res.amount, p_currency: res.currency,
    });
    return json({ ok: true, status: res.status, ref: res.ref, amount: res.amount, currency: res.currency });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
