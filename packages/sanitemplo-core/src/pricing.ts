/**
 * SANI TEMPLO · Motor de precio
 * ------------------------------------------------------------------
 * Puro. Sin I/O, sin fetch, sin Date.now(). Entra config, sale número.
 * Se prueba con vitest y se corre igual en el navegador, en el Worker
 * y en el RPC de Postgres (vía el port de plpgsql en la migración).
 *
 * PRINCIPIO NO NEGOCIABLE
 * La visita cuesta $11. Siempre. Para el gobierno y para la familia
 * artesana. Lo que se negocia es la PRESENCIA, nunca el acceso digno.
 * Si algún día alguien pide descuento por visita, la respuesta es no,
 * y esa negativa es el producto.
 */

import {
  ECONOMICS, SPACES, VOLUME_TIERS, PERIODS, PACK_BUNDLE, PRESENCE_FLOOR,
  COST_CURVE, UNKNOWNS, LEGAL, DIRECT_COST_MONTHLY,
  type Riel, type Space,
} from "./config";

export interface QuoteInput {
  visits: number;        // visitas patrocinadas, totales
  templos: number;       // unidades con presencia
  periodId: string;
  riel: Riel;
  spaceIds: string[];
  /** true = precios con IVA desglosado (riel A). Riel B no causa IVA. */
  withIva?: boolean;
}

export interface Quote {
  input: QuoteInput;
  period: (typeof PERIODS)[number];
  tier: (typeof VOLUME_TIERS)[number];
  spaces: Space[];
  isPack: boolean;
  floored: boolean;

  /** visitas · nunca descontado */
  visitsSubtotal: number;

  /** presencia · el desglose que se muestra al cliente, paso por paso */
  presenceList: number;        // tarifa lista por templo/mes
  presenceAfterVolume: number;
  presenceAfterPack: number;
  presenceMonthly: number;     // por templo/mes, tras plazo y piso
  presencePerTemplo: number;   // por templo, todo el plazo
  presenceSubtotal: number;    // × templos

  discounts: { label: string; pct: number; result: number }[];
  presenceListTotal: number;
  presenceSaved: number;
  presenceSavedPct: number;

  subtotal: number;
  iva: number;
  total: number;

  impact: { litros: number; compostaKg: number; visitas: number };
  split: Split;
  errors: string[];
}

export interface Split {
  base: "gross" | "margin" | "sponsorship";
  gross: number;
  fund: number;
  brandmark: number;
  flowbond: number;
  directCost: number;
  contribution: number;
  net: number;
  netPct: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export function tierFor(templos: number) {
  return VOLUME_TIERS.find((t) => templos <= t.max) ?? VOLUME_TIERS[VOLUME_TIERS.length - 1];
}
export function costFor(templos: number) {
  return (COST_CURVE.find((c) => templos <= c.max) ?? COST_CURVE[COST_CURVE.length - 1]).c;
}
export function periodFor(id: string) {
  return PERIODS.find((p) => p.id === id) ?? PERIODS.find((p) => p.id === "m1")!;
}

/** Los 10 espacios de riel A de un templo */
const RIEL_A_IDS = SPACES.filter((s) => s.riel === "A" && !s.sacred).map((s) => s.id);

export function quote(input: QuoteInput): Quote {
  const errors: string[] = [];
  const period = periodFor(input.periodId);
  const templos = Math.max(1, Math.floor(input.templos));
  const visits = Math.max(0, Math.floor(input.visits));
  const tier = tierFor(templos);

  // ── validación de rieles ────────────────────────────────
  let spaces = SPACES.filter((s) => input.spaceIds.includes(s.id));

  const sacred = spaces.filter((s) => s.sacred);
  if (sacred.length) {
    errors.push(`El altar no se vende. Si el altar se vende, no queda templo que patrocinar.`);
    spaces = spaces.filter((s) => !s.sacred);
  }
  const wrongRail = spaces.filter((s) => s.riel !== input.riel);
  if (wrongRail.length) {
    errors.push(
      `Riel ${input.riel} no puede incluir ${wrongRail.map((s) => s.name).join(", ")}. ` +
      `Afuera se anuncia, adentro se agradece. Son dos contratos, dos CFDI y dos superficies.`
    );
    spaces = spaces.filter((s) => s.riel === input.riel);
  }
  if (input.riel === "B" && !LEGAL.acDonataria.verified) {
    errors.push(
      `El Riel B está apagado: falta verificar que la A.C. sea donataria autorizada vigente ante el SAT. ` +
      `Sin eso no hay CFDI de donativo y no hay deducibilidad.`
    );
  }

  // ── visitas · precio fijo, sin descuento, jamás ─────────
  const visitsSubtotal = visits * ECONOMICS.visitPriceMxn;

  // ── presencia · el único lugar donde hay negociación ────
  const isPack = input.riel === "A" && RIEL_A_IDS.every((id) => input.spaceIds.includes(id));

  const presenceList = spaces.reduce((a, s) => a + s.price * s.qty, 0);
  const discounts: Quote["discounts"] = [];

  const presenceAfterVolume = presenceList * tier.f;
  discounts.push({
    label: `Volumen · ${tier.label} templos`,
    pct: round2((1 - tier.f) * 100),
    result: presenceAfterVolume,
  });

  const presenceAfterPack = presenceAfterVolume * (isPack ? PACK_BUNDLE : 1);
  if (isPack) {
    discounts.push({
      label: "Templo completo · los 10 espacios",
      pct: round2((1 - PACK_BUNDLE) * 100),
      result: presenceAfterPack,
    });
  }

  const longTerm = period.months >= 1;
  let presenceMonthly = longTerm ? presenceAfterPack * period.mult : presenceAfterPack;
  if (longTerm) {
    discounts.push({
      label: `Plazo · ${period.label}`,
      pct: round2((1 - period.mult) * 100),
      result: presenceMonthly,
    });
  }

  // piso duro: solo en plazos >= 1 mes con presencia real
  let floored = false;
  if (longTerm && presenceList > 0 && presenceMonthly < PRESENCE_FLOOR) {
    presenceMonthly = PRESENCE_FLOOR;
    floored = true;
    discounts.push({ label: `Piso de red · mínimo por templo/mes`, pct: 0, result: presenceMonthly });
  }

  const presencePerTemplo = longTerm
    ? presenceMonthly * period.months
    : presenceAfterPack * period.mult;
  const presenceSubtotal = presencePerTemplo * templos;

  const presenceListTotal = longTerm
    ? presenceList * period.months * templos
    : presenceList * period.mult * templos;
  const presenceSaved = Math.max(0, presenceListTotal - presenceSubtotal);
  const presenceSavedPct = presenceListTotal > 0 ? presenceSaved / presenceListTotal : 0;

  // ── totales ─────────────────────────────────────────────
  const subtotal = visitsSubtotal + presenceSubtotal;
  // Riel B es donativo: no causa IVA
  const ivaApplies = input.riel === "A" && input.withIva !== false;
  const iva = ivaApplies ? subtotal * ECONOMICS.ivaPct : 0;
  const total = subtotal + iva;

  // ── impacto · derivado de visitas, no de dinero ─────────
  const impact = {
    visitas: visits,
    litros: ECONOMICS.litrosMes * period.months * templos,
    compostaKg: ECONOMICS.compostaKgMes * period.months * templos,
  };

  const split = settle({
    visitsRevenue: visitsSubtotal,
    presenceRevenue: presenceSubtotal,
    templos,
    months: period.months,
  });

  return {
    input, period, tier, spaces, isPack, floored,
    visitsSubtotal,
    presenceList, presenceAfterVolume, presenceAfterPack,
    presenceMonthly, presencePerTemplo, presenceSubtotal,
    discounts, presenceListTotal, presenceSaved, presenceSavedPct,
    subtotal, iva, total, impact, split, errors,
  };
}

/* ═══════════════════════════════════════════════════════════
   Liquidación · quién se lleva qué
   ═══════════════════════════════════════════════════════════ */

export function settle(a: {
  visitsRevenue: number;
  presenceRevenue: number;
  templos: number;
  months: number;
}): Split {
  const gross = a.visitsRevenue + a.presenceRevenue;
  const directCost = costFor(a.templos) * a.templos * a.months;
  const contribution = gross - directCost;

  // La base del 33% es la decisión abierta. Ver UNKNOWNS.fundBase.
  const fundBaseAmount =
    UNKNOWNS.fundBase === "gross" ? gross
    : UNKNOWNS.fundBase === "margin" ? Math.max(0, contribution)
    : a.presenceRevenue; // "sponsorship" · recomendado

  const fund = fundBaseAmount * ECONOMICS.fundPct;
  const brandmark = a.presenceRevenue * ECONOMICS.brandmarkPct; // operador, sobre presencia
  const flowbond = gross * ECONOMICS.flowbondPct;               // tecnología, sobre bruto
  const net = gross - fund - brandmark - flowbond - directCost;

  return {
    base: UNKNOWNS.fundBase,
    gross, fund, brandmark, flowbond, directCost, contribution,
    net, netPct: gross > 0 ? net / gross : 0,
  };
}

/* ═══════════════════════════════════════════════════════════
   Equilibrio · el titular
   ═══════════════════════════════════════════════════════════ */

/**
 * ¿Cuántas visitas al día pagan el costo directo del templo?
 *
 * La base es la visita a $11 completos — ese es el titular ("15 al día"),
 * el mismo número que BREAKEVEN_VISITS_DAY. La única cosa que mueve el
 * equilibrio es la BASE DEL FONDO (UNKNOWNS.fundBase):
 *
 *  - "sponsorship" / "margin" → el 33% del fondo sale del patrocinio, no de
 *    la visita. La visita entrega sus $11 completos al costo → 15/día.
 *  - "gross" → el 33% del fondo se cobra sobre TODO el bruto, la visita
 *    incluida. Cada visita solo entrega $11·(1−0.33) al costo → sube a 22/día,
 *    y son justo los nodos rurales de bajo tráfico los que no llegan.
 *
 * (No se descuenta el 8% de FlowBond aquí: el titular es "la visita paga la
 *  operación del templo", no "la visita paga la plataforma". La plataforma se
 *  liquida en settle(), no en el equilibrio operativo.)
 */
export function breakeven(fundBase = UNKNOWNS.fundBase) {
  const perVisitNet =
    fundBase === "gross"
      ? ECONOMICS.visitPriceMxn * (1 - ECONOMICS.fundPct)
      : ECONOMICS.visitPriceMxn;

  const perMonth = Math.ceil(DIRECT_COST_MONTHLY / perVisitNet);
  return { perMonth, perDay: Math.ceil(perMonth / 30), perVisitNet: round2(perVisitNet) };
}

/* ═══════════════════════════════════════════════════════════
   Guardia de claims · el sistema no deja pasar lo que no puede decir
   ═══════════════════════════════════════════════════════════ */

export function checkClaim(text: string): { ok: boolean; hits: string[] } {
  const lower = text.toLowerCase();
  const hits = LEGAL.forbiddenClaims.filter((c) => lower.includes(c));
  return { ok: hits.length === 0, hits };
}

/** Riel B solo acepta un nombre. Ni logo, ni imagen, ni CTA, ni copy libre. */
export function validateRielBContent(c: { nombre?: string; logo?: unknown; cta?: unknown; imagen?: unknown; texto?: string }) {
  const errors: string[] = [];
  if (c.logo) errors.push("El Riel B no acepta logo. Un donativo con logo deja de ser donativo: se vuelve ingreso por publicidad, causa IVA y pierde deducibilidad.");
  if (c.cta) errors.push("El Riel B no acepta llamada a la acción.");
  if (c.imagen) errors.push("El Riel B no acepta imagen.");
  if (c.texto) errors.push("El Riel B no acepta texto libre. Solo el nombre.");
  if (!c.nombre?.trim()) errors.push("Falta el nombre para la placa de gratitud.");
  if (c.nombre && c.nombre.length > 48) errors.push("El nombre no cabe en la placa de 20 × 6 cm. Máximo 48 caracteres.");
  return { ok: errors.length === 0, errors };
}

export const fmtMxn = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export { clamp, round2 };
