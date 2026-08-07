// vpa-payout-tools — utilidades de los rieles de pago (solo super_admin).
//
//   test_paypal   valida las credenciales y dice si la cuenta puede hacer Payouts
//   test_wise     valida el token y LISTA los perfiles (para no teclear el profile id)
//   sync_paypal   consulta el lote en PayPal y cierra el pago cuando ya salió
//   verify_usdc   comprueba EN LA CADENA que el USDC/USDT llegó, y recién entonces marca pagado
//                 (el nombre de la acción se conserva por compatibilidad con el panel)
//
// El verificador cripto es la pieza clave del riel: Voces nunca guarda una llave
// privada (decisión de Steph), así que Mónica envía desde su propia wallet y aquí se
// confirma contra la blockchain que el token correcto, en la red correcta, llegó a la
// dirección correcta.
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

/* -------------------------------------------------------- USDC y USDT -- */
// Redes soportadas por el verificador. `evm:false` = no se puede leer con
// eth_getTransactionReceipt (Tron), así que ahí el cierre es manual.
//
// Cada red lleva VARIOS RPC y se prueban en orden: los públicos se caen o cierran
// sin avisar. Comprobado el 4-ago-2026: `polygon-rpc.com` devolvía 401 ("tenant
// disabled") y `eth.llamarpc.com` 521 — es decir, la verificación en las dos redes
// principales estaba muerta por el proveedor, no por el código.
const CHAINS: Record<string, { rpcs: string[]; name: string; explorer: string; evm: boolean }> = {
  base:     { rpcs: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
              name: "Base",     explorer: "https://basescan.org/tx/",            evm: true },
  polygon:  { rpcs: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org", "https://polygon-rpc.com"],
              name: "Polygon",  explorer: "https://polygonscan.com/tx/",         evm: true },
  ethereum: { rpcs: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org", "https://eth.llamarpc.com"],
              name: "Ethereum", explorer: "https://etherscan.io/tx/",            evm: true },
  arbitrum: { rpcs: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
              name: "Arbitrum", explorer: "https://arbiscan.io/tx/",             evm: true },
  optimism: { rpcs: ["https://mainnet.optimism.io", "https://optimism-rpc.publicnode.com"],
              name: "Optimism", explorer: "https://optimistic.etherscan.io/tx/", evm: true },
  tron:     { rpcs: [],
              name: "Tron",     explorer: "https://tronscan.org/#/transaction/", evm: false },
};

// REGLA DURA (Steph/Mónica, 4-ago-2026): sólo USDC y USDT OFICIALES.
// El verificador NO compara contra la wallet de destino sino contra el CONTRATO
// del token, y ese contrato es distinto por token Y por red: un dígito mal aquí
// haría que un pago legítimo se rechace o —peor— que uno equivocado se acepte.
// Los de USDC estaban ya en producción; los de USDT los confirmó Steph a mano
// contra Etherscan / Polygonscan / Tronscan (4-ago-2026).
const TOKENS: Record<string, Record<string, { token: string; decimals: number }>> = {
  USDC: {
    base:     { token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6 },
    polygon:  { token: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6 },
    ethereum: { token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    arbitrum: { token: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", decimals: 6 },
    optimism: { token: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", decimals: 6 },
  },
  USDT: {
    ethereum: { token: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
    polygon:  { token: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 },
    tron:     { token: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",         decimals: 6 }, // sólo informativo: Tron no se verifica solo
  },
};

// Tokens PARECIDOS que ya NO se aceptan. Existen de verdad y se envían por error,
// así que en vez de un "no encontré nada" se dice exactamente qué llegó.
const LOOKALIKES: Record<string, Record<string, string>> = {
  polygon: {
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": "USDC.e (USDC puenteado de Polygon)",
  },
};

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Prueba los RPC de la red en orden y se queda con el primero que responda.
// Un RPC caído no puede significar "ese pago no llegó": eso sería marcar como
// no pagado un envío real. Si fallan todos, se propaga el error y el panel lo dice.
async function rpcCall(urls: string[], method: string, params: unknown[]) {
  let last = "";
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!r.ok) { last = `${new URL(url).host} ${r.status}`; continue; }
      const j = await r.json().catch(() => null);
      if (!j) { last = `${new URL(url).host} respondió algo que no es JSON`; continue; }
      if (j.error) { last = `${new URL(url).host}: ${j.error?.message || "error"}`; continue; }
      return j.result;
    } catch (e) {
      last = `${new URL(url).host}: ${String((e as any)?.message || e)}`;
    }
  }
  throw new Error(`Ningún nodo de la red respondió (${method}). Último: ${last}`);
}

async function verifyCrypto(admin: any, payout: any, txHash: string) {
  const chain = String(payout.chain || "").toLowerCase();
  // Compatibilidad: las filas viejas (todas USDC) pueden no traer asset.
  const asset = String(payout.asset || "USDC").toUpperCase();
  const net = CHAINS[chain];
  const cfg = TOKENS[asset]?.[chain];
  const expected = Number(payout.fx_ok && payout.pay_amount ? payout.pay_amount : NaN);

  if (!net || !cfg) {
    return { ok: false, note: `La verificación automática no cubre ${asset} en la red "${payout.chain || "?"}". Revisa el envío a mano y usa "Marcar pagado".` };
  }

  // Tron no es EVM: no hay eth_getTransactionReceipt. Se revisa en Tronscan y se
  // cierra a mano. Vale más decirlo claro que fingir una verificación que no existe.
  if (!net.evm) {
    const clean = txHash.replace(/^0x/, "");
    const link = /^[a-fA-F0-9]{64}$/.test(clean) ? net.explorer + clean : null;
    return {
      ok: false, chain: net.name, asset, manual: true,
      explorer: link,
      note: `Tron no se puede verificar automáticamente desde aquí. Abre la transacción en Tronscan${link ? "" : " (pega el hash de 64 caracteres)"}, confirma que llegaron ${Number.isFinite(expected) ? "~" + expected.toFixed(2) : "los"} ${asset} a ${payout.wallet_address} y ciérralo con «✓ Marcar pagado».`,
    };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, note: "Ese hash no tiene forma de transacción (0x + 64 caracteres)." };
  }
  const dest = String(payout.wallet_address || "").toLowerCase();
  if (!dest) return { ok: false, note: "El pago no tiene dirección de destino." };

  const receipt = await rpcCall(net.rpcs, "eth_getTransactionReceipt", [txHash]);
  if (!receipt) return { ok: false, note: "Todavía no aparece en la red. Espera unos segundos y vuelve a intentar." };
  if (String(receipt.status) !== "0x1") {
    return { ok: false, note: "Esa transacción falló en la blockchain: no se envió nada." };
  }

  // Sólo el contrato OFICIAL de ese token en esa red. Nada de puenteados.
  const toDest = (receipt.logs || []).filter((l: any) =>
    String(l.topics?.[0]).toLowerCase() === TRANSFER_TOPIC &&
    l.topics?.length >= 3 &&
    ("0x" + String(l.topics[2]).slice(-40).toLowerCase()) === dest
  );
  const transfers = toDest.filter((l: any) => String(l.address).toLowerCase() === cfg.token);

  if (!transfers.length) {
    // ¿Llegó otro token a la dirección correcta? Decir cuál evita media hora de dudas.
    const others = toDest.map((l: any) => String(l.address).toLowerCase());
    const lookalike = others.map((a: string) => LOOKALIKES[chain]?.[a]).find(Boolean);
    const otherAsset = others.map((a: string) =>
      Object.keys(TOKENS).find((k) => TOKENS[k][chain]?.token === a)).find(Boolean);
    if (lookalike) {
      return { ok: false, tx: txHash, explorer: net.explorer + txHash,
        note: `Ese envío llegó a la dirección correcta pero en ${lookalike}, que NO es el token acordado (${asset} oficial en ${net.name}). No lo marqué como pagado: acuérdalo con la voz antes de cerrarlo.` };
    }
    if (otherAsset) {
      return { ok: false, tx: txHash, explorer: net.explorer + txHash,
        note: `Ese envío llegó a la dirección correcta pero en ${otherAsset}, y esta voz registró ${asset}. Corrige el token en su método de cobro o vuelve a enviar en ${asset}.` };
    }
    return { ok: false, tx: txHash, explorer: net.explorer + txHash,
      note: `Esa transacción existe, pero no contiene una transferencia de ${asset} hacia ${payout.wallet_address} en ${net.name}. Verifica el hash, la red y la dirección.` };
  }

  const units = transfers.reduce((n: bigint, l: any) => {
    const d = String(l.data || "");
    return n + (/^0x[0-9a-fA-F]+$/.test(d) ? BigInt(d) : 0n);
  }, 0n);
  const received = Number(units) / 10 ** cfg.decimals;

  // Cuánto se esperaba, en USD (USDC y USDT valen ~1). Tolerancia por comisión de red.
  const within = Number.isFinite(expected) ? received >= expected * 0.97 : true;

  if (!within) {
    return {
      ok: false, received, expected, asset, tx: txHash, explorer: net.explorer + txHash,
      note: `Llegaron ${received.toFixed(2)} ${asset} pero se esperaban ~${expected.toFixed(2)}. No lo marqué como pagado: revisa el monto.`,
    };
  }

  await admin.rpc("vpa__payout_result", {
    p_id: payout.id, p_status: "paid", p_ref: txHash,
    p_amount: received, p_currency: asset,
  });
  return {
    ok: true, status: "paid", received, expected: Number.isFinite(expected) ? expected : null,
    chain: net.name, asset, tx: txHash, explorer: net.explorer + txHash,
    note: `Confirmado en ${net.name}: ${received.toFixed(2)} ${asset} llegaron a la dirección de la voz. Pago cerrado y avisado.`,
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

    if (action === "sync_paypal" || action === "verify_usdc" || action === "verify_crypto") {
      if (!payout) return json({ error: "falta el pago" }, 400);
      const { data: p } = await admin.rpc("vpa__payout_for_execution", { p_id: payout });
      if (!p) return json({ error: "pago no encontrado" }, 404);
      if (p.status === "paid") return json({ ok: true, already: true, note: "Ese pago ya estaba cerrado." });

      if (action === "sync_paypal") {
        const { data: row } = await admin.from("app_vpa_payouts")
          .select("provider_ref").eq("id", payout).maybeSingle();
        return json(await syncPayPal(admin, cfg, modeOf("payouts_paypal"), payout, row?.provider_ref || ""));
      }
      return json(await verifyCrypto(admin, p, String(tx_hash || "").trim()));
    }

    return json({ error: "acción desconocida" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
