// vpa-payout-tools — utilidades de los rieles de pago (solo super_admin).
//
//   test_paypal   valida las credenciales y dice si la cuenta puede hacer Payouts
//   test_wise     valida el token y LISTA los perfiles (para no teclear el profile id)
//   sync_paypal   consulta el lote en PayPal y cierra el pago cuando ya salió
//   verify_usdc   comprueba EN LA CADENA que el USDC llegó, y recién entonces marca pagado
//
// El verificador de USDC es la pieza clave del riel cripto: Voces nunca guarda una llave
// privada (decisión de Steph), así que Mónica envía desde su propia wallet y aquí se
// confirma contra la blockchain que el monto correcto llegó a la dirección correcta.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

/* ----------------------------------------------------------------- PayPal -- */
const ppBase = (mode: string) =>
  mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function ppToken(id: string, secret: string, mode: string) {
  const r = await fetch(`${ppBase(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error_description || `PayPal rechazó las credenciales (${r.status})`);
  return { token: j.access_token as string, scopes: String(j.scope || "") };
}

async function testPayPal(cfg: any, mode: string) {
  const id = cfg?.vpa_paypal_client_id, secret = cfg?.vpa_paypal_secret;
  if (!id || !secret) return { ok: false, configured: false, note: "Faltan el Client ID y el Secret." };
  const { token, scopes } = await ppToken(id, secret, mode);
  // El scope de Payouts es lo que de verdad importa: sin él, la API acepta el login pero
  // rechaza cada envío. Vale más avisarlo aquí que descubrirlo con dinero de por medio.
  const canPayout = scopes.includes("payouts");
  return {
    ok: true, configured: true, mode,
    can_payout: canPayout,
    note: canPayout
      ? "Credenciales válidas y con permiso de Payouts. Listo para enviar dinero."
      : "Las credenciales sirven, pero la app NO tiene habilitado Payouts. En el panel de PayPal Developer entra a tu app → Features → activa 'Payouts' (PayPal debe aprobarlo en cuentas Business).",
    token_ok: !!token,
  };
}

async function syncPayPal(admin: any, cfg: any, mode: string, payoutId: string, ref: string) {
  const id = cfg?.vpa_paypal_client_id, secret = cfg?.vpa_paypal_secret;
  if (!id || !secret) return { ok: false, note: "PayPal no está conectado." };
  if (!ref) return { ok: false, note: "Ese pago no tiene referencia de lote de PayPal." };
  const { token } = await ppToken(id, secret, mode);
  const r = await fetch(`${ppBase(mode)}/v1/payments/payouts/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, note: j?.message || `PayPal ${r.status}` };

  const batch = j?.batch_header?.batch_status;            // PENDING|PROCESSING|SUCCESS|DENIED
  const item = j?.items?.[0];
  const itemStatus = item?.transaction_status;            // SUCCESS|FAILED|UNCLAIMED|RETURNED|BLOCKED
  const amount = Number(item?.payout_item?.amount?.value) || null;
  const ccy = item?.payout_item?.amount?.currency || null;

  if (itemStatus === "SUCCESS") {
    await admin.rpc("vpa__payout_result", {
      p_id: payoutId, p_status: "paid", p_ref: item?.transaction_id || ref,
      p_amount: amount, p_currency: ccy,
    });
    return { ok: true, status: "paid", batch, itemStatus, note: "PayPal confirmó el envío. La voz ya recibió su aviso." };
  }
  if (["FAILED", "RETURNED", "BLOCKED", "REFUNDED", "REVERSED"].includes(String(itemStatus)) || batch === "DENIED") {
    await admin.rpc("vpa__payout_result", {
      p_id: payoutId, p_status: "failed",
      p_error: `PayPal: ${itemStatus || batch}${item?.errors?.message ? " — " + item.errors.message : ""}`,
    });
    return { ok: true, status: "failed", batch, itemStatus, note: "PayPal rechazó el envío; el saldo volvió a quedar disponible." };
  }
  // UNCLAIMED = la voz no tiene cuenta PayPal con ese correo todavía; PayPal la retiene 30 días.
  return {
    ok: true, status: "processing", batch, itemStatus,
    note: itemStatus === "UNCLAIMED"
      ? "PayPal está reteniendo el pago porque ese correo aún no tiene cuenta PayPal. La voz tiene 30 días para abrirla o se devuelve."
      : "Todavía en proceso en PayPal. Vuelve a consultar en un rato.",
  };
}

/* ------------------------------------------------------------------- Wise -- */
const wiseBase = (mode: string) =>
  mode === "sandbox" ? "https://api.sandbox.transferwise.tech" : "https://api.transferwise.com";

async function testWise(cfg: any, mode: string) {
  const token = cfg?.vpa_wise_api_token;
  if (!token) return { ok: false, configured: false, note: "Falta el API token de Wise." };
  const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

  const r = await fetch(`${wiseBase(mode)}/v2/profiles`, { headers: H });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return { ok: false, configured: true, note: `Wise rechazó el token (${r.status}). ${t.slice(0, 160)}` };
  }
  const profiles = await r.json();
  const list = (Array.isArray(profiles) ? profiles : []).map((p: any) => ({
    id: p.id,
    type: p.type,
    name: p.type === "BUSINESS"
      ? (p.fullName || p.businessName || p?.details?.name)
      : [p?.details?.firstName, p?.details?.lastName].filter(Boolean).join(" ") || p.fullName,
  }));

  // El saldo importa: Wise paga DESDE el balance, no desde una tarjeta.
  const business = list.find((p: any) => p.type === "BUSINESS") || list[0];
  let balances: any[] = [];
  if (business) {
    const br = await fetch(`${wiseBase(mode)}/v4/profiles/${business.id}/balances?types=STANDARD`, { headers: H });
    if (br.ok) {
      const bs = await br.json().catch(() => []);
      balances = (Array.isArray(bs) ? bs : []).map((b: any) => ({
        currency: b.currency, amount: b?.amount?.value,
      })).filter((b: any) => Number(b.amount) > 0);
    }
  }
  return {
    ok: true, configured: true, mode, profiles: list,
    suggested_profile: business?.id ?? null,
    balances,
    note: list.length
      ? (business?.type === "BUSINESS"
          ? "Token válido. Usa el perfil Business para pagar a las voces."
          : "Token válido, pero no veo un perfil Business. Wise exige cuenta Business para pagar a terceros.")
      : "Token válido pero sin perfiles.",
  };
}

/* ------------------------------------------------------------------- USDC -- */
// Contratos oficiales de USDC por red (Circle nativo, no puenteado salvo donde se indica).
const USDC: Record<string, { rpc: string; token: string; decimals: number; name: string; explorer: string }> = {
  base:     { rpc: "https://mainnet.base.org",     token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6, name: "Base",     explorer: "https://basescan.org/tx/" },
  polygon:  { rpc: "https://polygon-rpc.com",      token: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6, name: "Polygon",  explorer: "https://polygonscan.com/tx/" },
  ethereum: { rpc: "https://eth.llamarpc.com",     token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, name: "Ethereum", explorer: "https://etherscan.io/tx/" },
  arbitrum: { rpc: "https://arb1.arbitrum.io/rpc", token: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", decimals: 6, name: "Arbitrum", explorer: "https://arbiscan.io/tx/" },
  optimism: { rpc: "https://mainnet.optimism.io",  token: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", decimals: 6, name: "Optimism", explorer: "https://optimistic.etherscan.io/tx/" },
};
// Polygon tuvo mucho tiempo el USDC puenteado (USDC.e); se acepta también para no rechazar pagos reales.
const USDC_ALT: Record<string, string[]> = { polygon: ["0x2791bca1f2de4661ed88a30c99a7a9449aa84174"] };

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function rpcCall(url: string, method: string, params: unknown[]) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!r.ok) throw new Error(`RPC ${method} ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`RPC ${method}: ${j.error?.message || "error"}`);
  return j.result;
}

async function verifyUsdc(admin: any, payout: any, txHash: string) {
  const chain = String(payout.chain || "").toLowerCase();
  const cfg = USDC[chain];
  if (!cfg) {
    return { ok: false, note: `La verificación automática todavía no cubre la red "${payout.chain || "?"}". Revisa el envío a mano y usa "Marcar pagado".` };
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, note: "Ese hash no tiene forma de transacción (0x + 64 caracteres)." };
  }
  const dest = String(payout.wallet_address || "").toLowerCase();
  if (!dest) return { ok: false, note: "El pago no tiene dirección de destino." };

  const receipt = await rpcCall(cfg.rpc, "eth_getTransactionReceipt", [txHash]);
  if (!receipt) return { ok: false, note: "Todavía no aparece en la red. Espera unos segundos y vuelve a intentar." };
  if (String(receipt.status) !== "0x1") {
    return { ok: false, note: "Esa transacción falló en la blockchain: no se envió nada." };
  }

  const valid = new Set([cfg.token, ...(USDC_ALT[chain] || [])]);
  const transfers = (receipt.logs || []).filter((l: any) =>
    valid.has(String(l.address).toLowerCase()) &&
    String(l.topics?.[0]).toLowerCase() === TRANSFER_TOPIC &&
    l.topics?.length >= 3 &&
    ("0x" + String(l.topics[2]).slice(-40).toLowerCase()) === dest
  );
  if (!transfers.length) {
    return { ok: false, note: `Esa transacción existe, pero no contiene una transferencia de USDC hacia ${payout.wallet_address} en ${cfg.name}. Verifica el hash, la red y la dirección.` };
  }

  const units = transfers.reduce((n: bigint, l: any) => {
    const d = String(l.data || "");
    return n + (/^0x[0-9a-fA-F]+$/.test(d) ? BigInt(d) : 0n);
  }, 0n);
  const received = Number(units) / 10 ** cfg.decimals;

  // Cuánto se esperaba, en USDC (≈ USD). Tolerancia por comisión de red / redondeo.
  const expected = Number(payout.fx_ok && payout.pay_amount ? payout.pay_amount : NaN);
  const within = Number.isFinite(expected) ? received >= expected * 0.97 : true;

  if (!within) {
    return {
      ok: false, received, expected, tx: txHash, explorer: cfg.explorer + txHash,
      note: `Llegaron ${received.toFixed(2)} USDC pero se esperaban ~${expected.toFixed(2)}. No lo marqué como pagado: revisa el monto.`,
    };
  }

  await admin.rpc("vpa__payout_result", {
    p_id: payout.id, p_status: "paid", p_ref: txHash,
    p_amount: received, p_currency: "USDC",
  });
  return {
    ok: true, status: "paid", received, expected: Number.isFinite(expected) ? expected : null,
    chain: cfg.name, tx: txHash, explorer: cfg.explorer + txHash,
    note: `Confirmado en ${cfg.name}: ${received.toFixed(2)} USDC llegaron a la dirección de la voz. Pago cerrado y avisado.`,
  };
}

/* ------------------------------------------------------------------ serve -- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: role } = await caller.rpc("vpa_my_role");
    if (role !== "super_admin") return json({ error: "forbidden" }, 403);

    const { action, payout, tx_hash } = await req.json().catch(() => ({}));
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: cfg } = await admin.rpc("vpa__payment_config");
    const { data: setRows } = await admin
      .from("app_vpa_settings").select("key,value").in("key", ["payouts_paypal", "payouts_wise"]);
    const modeOf = (k: string) =>
      (setRows || []).find((r: any) => r.key === k)?.value?.mode || "live";

    if (action === "test_paypal") return json(await testPayPal(cfg, modeOf("payouts_paypal")));
    if (action === "test_wise") return json(await testWise(cfg, modeOf("payouts_wise")));

    if (action === "sync_paypal" || action === "verify_usdc") {
      if (!payout) return json({ error: "falta el pago" }, 400);
      const { data: p } = await admin.rpc("vpa__payout_for_execution", { p_id: payout });
      if (!p) return json({ error: "pago no encontrado" }, 404);
      if (p.status === "paid") return json({ ok: true, already: true, note: "Ese pago ya estaba cerrado." });

      if (action === "sync_paypal") {
        const { data: row } = await admin.from("app_vpa_payouts")
          .select("provider_ref").eq("id", payout).maybeSingle();
        return json(await syncPayPal(admin, cfg, modeOf("payouts_paypal"), payout, row?.provider_ref || ""));
      }
      return json(await verifyUsdc(admin, p, String(tx_hash || "").trim()));
    }

    return json({ error: "acción desconocida" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
