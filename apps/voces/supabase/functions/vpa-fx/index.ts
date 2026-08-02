// vpa-fx — refresca el tipo de cambio real. Base estable = USD.
//
// Lo dispara pg_cron una vez al día (y se puede llamar a mano desde /admin → Pagos).
// Fuente primaria: open.er-api.com (gratis, sin llave). Respaldo: frankfurter.app (BCE).
// Nunca guarda un lote que no pase las validaciones de cordura de vpa__fx_store:
// un tipo de cambio malo despreciaría TODO el catálogo, así que ante la duda no se toca nada.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

async function fromErApi() {
  const r = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!r.ok) throw new Error(`er-api ${r.status}`);
  const j = await r.json();
  if (j?.result !== "success" || j?.base_code !== "USD") throw new Error("er-api: respuesta inesperada");
  return { rates: j.rates as Record<string, number>, source: "open.er-api.com", at: j.time_last_update_utc };
}

// Respaldo: el BCE publica con base EUR, así que se re-basa a USD.
async function fromFrankfurter() {
  const r = await fetch("https://api.frankfurter.app/latest?from=USD");
  if (!r.ok) throw new Error(`frankfurter ${r.status}`);
  const j = await r.json();
  const rates = { ...(j?.rates || {}), USD: 1 };
  if (!rates.MXN) throw new Error("frankfurter: sin MXN");
  return { rates: rates as Record<string, number>, source: "frankfurter.app (BCE)", at: j?.date };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let got: { rates: Record<string, number>; source: string; at?: string } | null = null;
    const problems: string[] = [];

    for (const fn of [fromErApi, fromFrankfurter]) {
      try { got = await fn(); break; } catch (e) { problems.push(String(e?.message || e)); }
    }
    if (!got) return json({ ok: false, error: "ninguna fuente respondió", problems }, 502);

    // Normaliza y fuerza la base: USD = 1 exacto.
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(got.rates)) {
      const n = Number(v);
      if (/^[A-Z]{3}$/.test(k) && Number.isFinite(n) && n > 0) clean[k] = n;
    }
    clean.USD = 1;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // vpa__fx_store valida cordura (USD=1, MXN en rango, >=20 monedas) y aborta el lote entero si no.
    const { data: n, error } = await admin.rpc("vpa__fx_store", {
      p_rates: clean, p_source: got.source,
    });
    if (error) return json({ ok: false, error: error.message, source: got.source }, 400);

    return json({
      ok: true, stored: n, source: got.source, source_updated: got.at,
      mxn_per_usd: clean.MXN, eur_per_usd: clean.EUR, ars_per_usd: clean.ARS,
      fallback_used: problems.length > 0, problems,
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
