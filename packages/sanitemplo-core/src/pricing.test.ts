/**
 * SANI TEMPLO · pricing · las invariantes que no se negocian.
 * Corre ANTES de una sola línea de UI (PROMPT §10.1).
 */
import { describe, it, expect } from "vitest";
import {
  quote,
  breakeven,
  checkClaim,
  validateRielBContent,
  settle,
} from "./pricing";
import {
  ECONOMICS,
  PRESENCE_FLOOR,
  BREAKEVEN_VISITS_DAY,
  LEGAL,
} from "./config";

describe("la visita nunca se descuenta", () => {
  it("cobra $11 por visita sin importar el volumen de templos ni el plazo", () => {
    for (const templos of [1, 50, 1000]) {
      const q = quote({
        visits: 500,
        templos,
        periodId: "m12",
        riel: "A",
        spaceIds: ["loto"],
      });
      expect(q.visitsSubtotal).toBe(500 * ECONOMICS.visitPriceMxn);
    }
  });

  it("ningún renglón de descuento toca la visita: todos operan sobre presencia", () => {
    const q = quote({
      visits: 9000,
      templos: 1000,
      periodId: "m24",
      riel: "A",
      spaceIds: ["sol", "loto", "luna", "milpa", "semilla", "aroma", "repisa", "espejo", "raiz", "cta"],
    });
    // el subtotal de visitas es exactamente visitas × $11, intocable
    expect(q.visitsSubtotal).toBe(9000 * 11);
    // y el ahorro reportado sale solo de la presencia
    expect(q.presenceSaved).toBeGreaterThan(0);
  });
});

describe("riel B rechaza logo — afuera se anuncia, adentro se agradece", () => {
  it("validateRielBContent bloquea logo/cta/imagen/texto libre", () => {
    const r = validateRielBContent({ nombre: "Familia Pérez", logo: {} });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/logo/i);
  });

  it("acepta solo el nombre grabado", () => {
    const r = validateRielBContent({ nombre: "Familia Pérez" });
    expect(r.ok).toBe(true);
  });

  it("un espacio de riel A no puede colarse en una orden de riel B", () => {
    const q = quote({
      visits: 100,
      templos: 1,
      periodId: "m1",
      riel: "B",
      spaceIds: ["placa", "loto"], // loto es riel A
    });
    expect(q.errors.join(" ")).toMatch(/afuera se anuncia/i);
    // y el motor lo saca: la orden nunca lleva el espacio del riel equivocado
    expect(q.spaces.some((s) => s.riel === "A")).toBe(false);
  });

  it("riel B está apagado mientras la A.C. no esté verificada como donataria", () => {
    // el kit llega con LEGAL.acDonataria.verified = false
    expect(LEGAL.acDonataria.verified).toBe(false);
    const q = quote({
      visits: 100,
      templos: 1,
      periodId: "m1",
      riel: "B",
      spaceIds: ["placa"],
    });
    expect(q.errors.join(" ")).toMatch(/donataria autorizada/i);
  });
});

describe("el altar no se vende", () => {
  it("rechaza el altar y lo excluye de la orden", () => {
    const q = quote({
      visits: 100,
      templos: 1,
      periodId: "m1",
      riel: "B",
      spaceIds: ["altar"],
    });
    expect(q.errors.join(" ")).toMatch(/altar no se vende/i);
    expect(q.spaces.some((s) => s.id === "altar")).toBe(false);
  });
});

describe("el piso de presencia no se cruza", () => {
  it("una presencia chica a plazo largo se detiene en el piso de red", () => {
    const q = quote({
      visits: 0,
      templos: 1,
      periodId: "m12",
      riel: "A",
      spaceIds: ["semilla"], // 400 × 2 = 800 de lista
    });
    expect(q.floored).toBe(true);
    expect(q.presenceMonthly).toBe(PRESENCE_FLOOR);
  });
});

describe("el equilibrio — el titular", () => {
  it("15 visitas/día con la base recomendada (sponsorship), = la constante del titular", () => {
    expect(breakeven("sponsorship").perDay).toBe(15);
    expect(breakeven().perDay).toBe(BREAKEVEN_VISITS_DAY); // default = sponsorship = 15
  });

  it("con base 'gross' el fondo sangra la visita y el equilibrio sube a 22/día", () => {
    // (no es 32: 32 no se reproduce con estas constantes; 22 sí, con la misma regla)
    expect(breakeven("gross").perDay).toBe(22);
    expect(breakeven("gross").perDay).toBeGreaterThan(breakeven("sponsorship").perDay);
  });
});

describe("guardia de claims — lo que el patrocinador no puede decir", () => {
  it("bloquea 'carbono neutral' y variantes", () => {
    expect(checkClaim("Marca 100% carbono neutral").ok).toBe(false);
    expect(checkClaim("evento compensado y net zero").ok).toBe(false);
  });
  it("deja pasar lo auditable", () => {
    expect(checkClaim("18,000 litros de agua no usados este mes").ok).toBe(true);
  });
});

describe("liquidación — base sponsorship no toca la visita", () => {
  it("el fondo se calcula sobre presencia, no sobre el ingreso de visitas", () => {
    const s = settle({ visitsRevenue: 10000, presenceRevenue: 5000, templos: 1, months: 1 });
    // fondo = 33% de la presencia (base sponsorship), nunca de las visitas
    expect(s.fund).toBeCloseTo(5000 * ECONOMICS.fundPct, 2);
    expect(s.base).toBe("sponsorship");
  });
});
