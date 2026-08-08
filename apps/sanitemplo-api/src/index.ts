// ============================================================================
// sanitemplo-api — Cloudflare Worker.
// El patrocinador compra visitas. Cotiza, crea la orden (única o mensual), la
// cobra (Mercado Pago o transferencia), asigna visitas a nodos y liquida. La
// MATEMÁTICA NO VIVE AQUÍ: entra de @flowbond/sanitemplo-core (quote/settle) —
// el mismo motor del navegador y los tests. El Worker orquesta identidad + pago
// + persistencia.
//
//   POST /quote                → cotiza (puro, sin auth, sin DB)
//   POST /lead                 → sanitemplo_submit_lead (público)
//   POST /order                → auth; recotiza; create_order; abre el cobro
//   POST /allocate             → auth; valida dueño; sanitemplo_allocate
//   POST /settle               → admin token; settle() por nodo
//   POST /webhook/mercadopago  → MP confirma; verifica status; registra split
//   POST /payment/manual       → admin token; concilia transferencia + split
//   GET  /fund                 → sanitemplo_fund_public (sin login)
//   GET  /health
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  quote,
  settle,
  periodFor,
  LEGAL,
  ECONOMICS,
  type QuoteInput,
  type Riel,
} from "@flowbond/sanitemplo-core";
import { selectAdapter, MercadoPagoAdapter, type Cadencia } from "./payment";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  SANITEMPLO_ADMIN_TOKEN?: string;
  MP_ACCESS_TOKEN?: string;
}

// ── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://reciprociudad.lat",
  "https://reciprociudad.vercel.app",
  "https://test.reciprociudad.pages.dev",
  "https://sanitemplo-sponsors.pages.dev",
  "https://sanitemplo.com",
  "https://www.sanitemplo.com",
  "http://localhost:3000",
  "http://localhost:3060",
]);
// Exacto, o cualquier preview *.sanitemplo-sponsors.pages.dev (deploys de CF Pages).
const originOk = (o: string) => ALLOWED_ORIGINS.has(o) || /^https:\/\/[a-z0-9-]+\.sanitemplo-sponsors\.pages\.dev$/.test(o);
const corsOrigin = (o: string | null) => (o && originOk(o) ? o : "https://sanitemplo-sponsors.pages.dev");
const cors = (o: string | null = null) => ({
  "access-control-allow-origin": corsOrigin(o),
  vary: "Origin",
  "access-control-allow-headers": "authorization, content-type, x-service-token",
  "access-control-allow-methods": "POST, GET, OPTIONS",
});
const json = (o: unknown, s = 200, origin: string | null = null) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors(origin) } });

const round2 = (v: number) => Math.round(v * 100) / 100;

// ── clients ───────────────────────────────────────────────────────────────
const service = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function callerFbid(env: Env, req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// El split de una orden, con el MISMO settle() del core. nodo = 0 hasta que se
// defina split_local_pct (TODO_CONFIRM) — honesto, no inventado.
interface OrderRow {
  id: string;
  visitas_subtotal: number;
  presencia_subtotal: number;
  templos: number;
  plazo_id: string;
  total: number;
  cadencia: Cadencia;
  status: string;
}
function computeSplit(o: OrderRow) {
  const months = periodFor(o.plazo_id).months;
  const s = settle({
    visitsRevenue: Number(o.visitas_subtotal),
    presenceRevenue: Number(o.presencia_subtotal),
    templos: o.templos,
    months,
  });
  return { fund: round2(s.fund), brandmark: round2(s.brandmark), flowbond: round2(s.flowbond), nodo: 0 };
}

async function recordPaid(env: Env, o: OrderRow, provider: string, providerRef: string | null) {
  const sb = service(env);
  const sp = computeSplit(o);
  const { data, error } = await sb.rpc("sanitemplo_record_payment", {
    p_order_id: o.id,
    p_provider: provider,
    p_provider_ref: providerRef,
    p_status: "paid",
    p_amount: o.total,
    p_cadencia: o.cadencia,
    p_fondo: sp.fund,
    p_brandmark: sp.brandmark,
    p_flowbond: sp.flowbond,
    p_nodo: sp.nodo,
    p_node_id: null,
  });
  if (error) throw new Error(error.message);
  return { paymentId: data as number, split: sp };
}

async function fetchOrder(env: Env, orderId: string): Promise<OrderRow | null> {
  const { data } = await service(env)
    .from("sanitemplo_orders")
    .select("id, visitas_subtotal, presencia_subtotal, templos, plazo_id, total, cadencia, status")
    .eq("id", orderId)
    .maybeSingle();
  return (data as OrderRow) ?? null;
}

// ── handlers ────────────────────────────────────────────────────────────────
function handleQuote(body: QuoteInput, origin: string | null): Response {
  return json(quote(body), 200, origin);
}

async function handleOrder(env: Env, req: Request, body: OrderBody, origin: string | null): Promise<Response> {
  const fbid = await callerFbid(env, req);
  if (!fbid) return json({ error: "Necesitas iniciar sesión para comprar visitas." }, 401, origin);

  const cadencia: Cadencia = body.cadence === "mensual" ? "mensual" : "unica";
  const input: QuoteInput = {
    visits: body.visits,
    templos: body.templos,
    periodId: body.periodId,
    riel: body.riel,
    spaceIds: body.spaceIds ?? [],
    withIva: body.riel === "A",
  };
  if (input.riel === "B" && !LEGAL.acDonataria.verified) {
    return json({ error: "El Riel B está apagado: falta verificar la donataria autorizada ante el SAT." }, 409, origin);
  }
  const q = quote(input);
  if (q.errors.length) return json({ error: q.errors.join(" "), errors: q.errors }, 422, origin);

  const sb = service(env);
  const { data: orderId, error } = await sb.rpc("sanitemplo_create_order", {
    p_fbid: fbid,
    p_razon_social: body.razonSocial ?? "",
    p_rfc: body.rfc ?? "",
    p_riel: input.riel,
    p_visitas: q.input.visits,
    p_templos: q.input.templos,
    p_plazo_id: input.periodId,
    p_space_tipos: input.spaceIds,
    p_visitas_subtotal: q.visitsSubtotal,
    p_presencia_subtotal: q.presenceSubtotal,
    p_subtotal: q.subtotal,
    p_iva: q.iva,
    p_total: q.total,
    p_cadencia: cadencia,
  });
  if (error) return json({ error: error.message }, 500, origin);

  const adapter = selectAdapter(env);
  const charge = await adapter.createCharge({
    orderId: orderId as string,
    amountMxn: q.total,
    cadencia,
    riel: input.riel,
    concept: input.riel === "A" ? "Patrocinio Sani Templo (publicidad)" : "Donativo Sani Templo",
    email: body.email,
  });

  return json(
    { orderId, total: q.total, cadencia, pendingVisits: q.input.visits, charge, split: computeSplit({
      id: orderId as string, visitas_subtotal: q.visitsSubtotal, presencia_subtotal: q.presenceSubtotal,
      templos: q.input.templos, plazo_id: input.periodId, total: q.total, cadencia, status: "cotizada",
    }) },
    200,
    origin,
  );
}

async function handleAllocate(env: Env, req: Request, body: AllocateBody, origin: string | null): Promise<Response> {
  const fbid = await callerFbid(env, req);
  if (!fbid) return json({ error: "Sesión requerida." }, 401, origin);
  const sb = service(env);
  const { data: owns, error: ownErr } = await sb
    .from("sanitemplo_orders")
    .select("id, sanitemplo_sponsors!inner(fbid)")
    .eq("id", body.orderId)
    .eq("sanitemplo_sponsors.fbid", fbid)
    .maybeSingle();
  if (ownErr) return json({ error: ownErr.message }, 500, origin);
  if (!owns) return json({ error: "Esa orden no es tuya." }, 403, origin);

  const { data: allocId, error } = await sb.rpc("sanitemplo_allocate", {
    p_order_id: body.orderId,
    p_node_id: body.nodeId,
    p_visitas: body.visits,
    p_inicio: body.startDate,
    p_fin: body.endDate,
  });
  if (error) return json({ error: error.message }, 422, origin);
  const { data: pending } = await sb.rpc("sanitemplo_order_pending", { p_order_id: body.orderId });
  return json({ allocationId: allocId, pendingVisits: pending ?? 0 }, 200, origin);
}

// RESERVAR (público, sin login): arma la orden como lead + abre el pago con
// tarjeta (Mercado Pago Checkout Pro, todos los métodos, tarjeta por default).
// Sin MP token → registra la reserva y devuelve checkoutUrl null.
async function handleReservar(env: Env, body: ReservarBody, origin: string | null): Promise<Response> {
  const riel: Riel = body.riel === "B" ? "B" : "A";
  if (riel === "B" && !LEGAL.acDonataria.verified) {
    return json({ error: "El Riel B está apagado hasta verificar la donataria." }, 409, origin);
  }
  const q = quote({ visits: 0, templos: body.templos, periodId: body.periodId, riel, spaceIds: body.spaceIds ?? [], withIva: riel === "A" });
  // La superficie (HTML v2 de Sani Templo) calcula el precio en el cliente con
  // el mismo modelo; si manda amountMxn se usa ese. Si no, se recotiza aquí.
  const total = body.amountMxn && body.amountMxn > 0 ? body.amountMxn : q.total;
  if (!body.amountMxn && q.errors.length) return json({ error: q.errors.join(" "), errors: q.errors }, 422, origin);

  const sb = service(env);
  const { data: leadId, error } = await sb.rpc("sanitemplo_submit_lead", {
    p_email: body.email, p_nombre: body.nombre ?? null, p_razon_social: body.razonSocial ?? null,
    p_riel: riel, p_visitas: null, p_templos: body.templos, p_plazo_id: body.periodId,
    p_space_tipos: body.spaceIds ?? null, p_node_ids: null,
    p_mensaje: body.detalle ?? `Reserva ${body.templos} templos · ${fmtLabel(body.spaceIds)} · total ${total}`,
  });
  if (error) return json({ error: error.message }, 422, origin);

  let checkoutUrl: string | null = null;
  if (env.MP_ACCESS_TOKEN) {
    const mp = new MercadoPagoAdapter(env.MP_ACCESS_TOKEN);
    const charge = await mp.createCharge({
      orderId: String(leadId), amountMxn: total,
      cadencia: (body.cadence === "mensual" ? "mensual" : "unica") as Cadencia,
      riel, concept: riel === "A" ? "Patrocinio Sani Templo" : "Donativo Sani Templo", email: body.email,
      backUrl: origin ? `${origin}/?reservado=1` : undefined,
    });
    checkoutUrl = charge.checkoutUrl;
  }
  return json({ leadId, total, checkoutUrl }, 200, origin);
}

function fmtLabel(ids?: string[]) { return (ids ?? []).join("+") || "sin espacios"; }

async function handleSettle(env: Env, req: Request, body: SettleBody, origin: string | null): Promise<Response> {
  const token = req.headers.get("x-service-token");
  if (!env.SANITEMPLO_ADMIN_TOKEN || token !== env.SANITEMPLO_ADMIN_TOKEN) return json({ error: "No autorizado." }, 401, origin);
  if (!/^\d{4}-\d{2}$/.test(body.period)) return json({ error: "period debe ser YYYY-MM." }, 400, origin);

  const periodo = `${body.period}-01`;
  const monthEnd = new Date(`${periodo}T00:00:00Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const endStr = monthEnd.toISOString().slice(0, 10);

  const sb = service(env);
  const { data: allocs, error } = await sb
    .from("sanitemplo_allocations")
    .select("node_id, visitas_asignadas, order_id, sanitemplo_orders!inner(visitas, presencia_subtotal)")
    .lte("fecha_inicio", endStr)
    .gte("fecha_fin", periodo);
  if (error) return json({ error: error.message }, 500, origin);

  type Row = { node_id: string; visitas_asignadas: number; order_id: string; sanitemplo_orders: { visitas: number; presencia_subtotal: number } };
  const rows = (allocs ?? []) as unknown as Row[];
  const byNode = new Map<string, { visits: number; presence: number }>();
  for (const r of rows) {
    const ord = r.sanitemplo_orders;
    const share = ord.visitas > 0 ? r.visitas_asignadas / ord.visitas : 0;
    const acc = byNode.get(r.node_id) ?? { visits: 0, presence: 0 };
    acc.visits += r.visitas_asignadas;
    acc.presence += Number(ord.presencia_subtotal) * share;
    byNode.set(r.node_id, acc);
  }

  const results: { nodeId: string; settlementId: number | null; net: number }[] = [];
  for (const [nodeId, agg] of byNode) {
    const split = settle({ visitsRevenue: agg.visits * ECONOMICS.visitPriceMxn, presenceRevenue: agg.presence, templos: 1, months: 1 });
    const { data: id, error: upErr } = await sb.rpc("sanitemplo_upsert_settlement", {
      p_periodo: periodo, p_node_id: nodeId,
      p_bruto: round2(split.gross), p_fondo: round2(split.fund), p_brandmark: round2(split.brandmark),
      p_flowbond: round2(split.flowbond), p_costo: round2(split.directCost), p_neto_nodo: 0, p_neto: round2(split.net),
    });
    if (upErr) return json({ error: upErr.message, nodeId }, 500, origin);
    results.push({ nodeId, settlementId: (id as number) ?? null, net: round2(split.net) });
  }
  return json({ period: body.period, nodes: results.length, results }, 200, origin);
}

// MP confirma el cobro. Verificamos el status REAL contra la API de MP (con
// nuestro token) antes de registrar: un webhook falso no puede marcar pagado.
async function handleMpWebhook(env: Env, req: Request, origin: string | null): Promise<Response> {
  if (!env.MP_ACCESS_TOKEN) return json({ ok: false, note: "MP no configurado." }, 200, origin);
  const url = new URL(req.url);
  const body = (await readJson<{ type?: string; data?: { id?: string } }>(req)) ?? {};
  const topic = body.type ?? url.searchParams.get("topic") ?? url.searchParams.get("type");
  const paymentId = body.data?.id ?? url.searchParams.get("id") ?? url.searchParams.get("data.id");
  if (topic !== "payment" || !paymentId) return json({ ok: true, ignored: topic }, 200, origin);

  const mp = new MercadoPagoAdapter(env.MP_ACCESS_TOKEN);
  const charge = await mp.getStatus(paymentId);
  if (charge.status !== "paid" || !charge.externalRef) return json({ ok: true, status: charge.status }, 200, origin);

  const sb = service(env);
  // idempotencia: no registrar dos veces el mismo pago
  const { data: seen } = await sb.from("sanitemplo_payments").select("id").eq("provider_ref", paymentId).maybeSingle();
  if (seen) return json({ ok: true, duplicate: true }, 200, origin);

  const order = await fetchOrder(env, charge.externalRef);
  if (!order) return json({ ok: false, error: "orden no encontrada" }, 200, origin);
  const { paymentId: pid, split } = await recordPaid(env, order, "mercadopago", paymentId);
  return json({ ok: true, paymentId: pid, split }, 200, origin);
}

// Conciliación de transferencia / prueba del ledger de splits sin MP.
async function handleManualPayment(env: Env, req: Request, body: ManualPayBody, origin: string | null): Promise<Response> {
  const token = req.headers.get("x-service-token");
  if (!env.SANITEMPLO_ADMIN_TOKEN || token !== env.SANITEMPLO_ADMIN_TOKEN) return json({ error: "No autorizado." }, 401, origin);
  const order = await fetchOrder(env, body.orderId);
  if (!order) return json({ error: "Orden no encontrada." }, 404, origin);
  const { paymentId, split } = await recordPaid(env, order, "manual_transfer", body.reference ?? null);
  return json({ ok: true, paymentId, split }, 200, origin);
}

async function handleLead(env: Env, body: LeadBody, origin: string | null): Promise<Response> {
  const { data, error } = await service(env).rpc("sanitemplo_submit_lead", {
    p_email: body.email, p_nombre: body.nombre ?? null, p_razon_social: body.razonSocial ?? null,
    p_riel: body.riel, p_visitas: body.visits ?? null, p_templos: body.templos ?? null,
    p_plazo_id: body.periodId ?? null, p_space_tipos: body.spaceIds ?? null,
    p_node_ids: body.nodeIds ?? null, p_mensaje: body.mensaje ?? null,
  });
  if (error) return json({ error: error.message }, 422, origin);
  return json({ leadId: data }, 200, origin);
}

async function handleFund(env: Env, origin: string | null): Promise<Response> {
  const { data, error } = await service(env).from("sanitemplo_fund_public").select("*");
  if (error) return json({ error: error.message }, 500, origin);
  return json({ fund: data ?? [] }, 200, origin);
}

// ── router ───────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    const path = new URL(req.url).pathname.replace(/\/+$/, "") || "/";

    try {
      if (req.method === "GET" && path === "/health") return json({ ok: true }, 200, origin);
      if (req.method === "GET" && path === "/fund") return handleFund(env, origin);

      if (req.method === "POST" && path === "/quote") {
        const b = await readJson<QuoteInput>(req);
        return b ? handleQuote(b, origin) : json({ error: "JSON inválido." }, 400, origin);
      }
      if (req.method === "POST" && path === "/lead") {
        const b = await readJson<LeadBody>(req);
        if (!b?.email || !b?.riel) return json({ error: "email y riel requeridos." }, 400, origin);
        return handleLead(env, b, origin);
      }
      if (req.method === "POST" && path === "/order") {
        const b = await readJson<OrderBody>(req);
        return b ? handleOrder(env, req, b, origin) : json({ error: "JSON inválido." }, 400, origin);
      }
      if (req.method === "POST" && path === "/allocate") {
        const b = await readJson<AllocateBody>(req);
        if (!b?.orderId || !b?.nodeId) return json({ error: "orderId y nodeId requeridos." }, 400, origin);
        return handleAllocate(env, req, b, origin);
      }
      if (req.method === "POST" && path === "/settle") {
        const b = await readJson<SettleBody>(req);
        if (!b?.period) return json({ error: "period requerido." }, 400, origin);
        return handleSettle(env, req, b, origin);
      }
      if (req.method === "POST" && path === "/reservar") {
        const b = await readJson<ReservarBody>(req);
        if (!b?.email) return json({ error: "email requerido." }, 400, origin);
        return handleReservar(env, b, origin);
      }
      if (req.method === "POST" && path === "/webhook/mercadopago") return handleMpWebhook(env, req, origin);
      if (req.method === "POST" && path === "/payment/manual") {
        const b = await readJson<ManualPayBody>(req);
        if (!b?.orderId) return json({ error: "orderId requerido." }, 400, origin);
        return handleManualPayment(env, req, b, origin);
      }
      return json({ error: "No encontrado." }, 404, origin);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Error interno." }, 500, origin);
    }
  },
};

// ── shapes ───────────────────────────────────────────────────────────────
interface OrderBody {
  visits: number; templos: number; periodId: string; riel: Riel;
  spaceIds?: string[]; razonSocial?: string; rfc?: string; email?: string;
  cadence?: "unica" | "mensual";
}
interface AllocateBody { orderId: string; nodeId: string; visits: number; startDate: string; endDate: string }
interface SettleBody { period: string }
interface ReservarBody {
  templos: number; periodId: string; riel: Riel; spaceIds?: string[];
  email: string; nombre?: string; razonSocial?: string; cadence?: "unica" | "mensual";
  amountMxn?: number; detalle?: string;
}
interface ManualPayBody { orderId: string; reference?: string }
interface LeadBody {
  email: string; riel: Riel; nombre?: string; razonSocial?: string;
  visits?: number; templos?: number; periodId?: string; spaceIds?: string[]; nodeIds?: string[]; mensaje?: string;
}
