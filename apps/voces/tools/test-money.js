/* Pruebas del bloque canónico de moneda (node tools/test-money.js).
   Simula el navegador y ejecuta el módulo tal cual se sirve. */
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(path.join(__dirname, "voces-money.js"), "utf8");

// --- tasas reales leídas de app_vpa_fx_rates (base USD) --------------------
const RATES = JSON.parse(fs.readFileSync(path.join(__dirname, "fx-snapshot.json"), "utf8"));

function makeEnv({ lang = "es-MX", cc = null, ccy = null, rates = RATES, fetched = new Date().toISOString(), stale = false, ipCountry = null }) {
  const store = {};
  if (cc) store.vpa_cc = cc;
  if (ccy) store.vpa_ccy = ccy;
  const win = {};
  const sandbox = {
    window: win,
    navigator: { language: lang },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    fetch: async () => ({ ok: !!ipCountry, json: async () => ({ country_code: ipCountry }) }),
    AbortController, setTimeout, clearTimeout, Date, Intl, Math, Number, JSON, isFinite, String, Object, Promise, console,
  };
  const vm = require("vm");
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  const sb = { rpc: () => ({ abortSignal: () => Promise.resolve({ data: { rates, fetched_at: fetched, stale } }) }) };
  return { VM: win.VM, sb, store };
}

let pass = 0, fail = 0;
const norm = s => String(s).replace(/[\u00a0\u202f]/g, " ");
function check(name, got, want) {
  const ok = norm(got) === norm(want);
  if (ok) { pass++; } else { fail++; console.log(`  ✗ ${name}\n      esperado: ${want}\n      obtenido: ${got}`); }
}
function checkTrue(name, cond, extra = "") {
  if (cond) pass++; else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

(async () => {
  console.log("— 1. país → moneda + formato en el país del visitante");
  const casos = [
    // país, idioma navegador, precio MXN, moneda esperada, texto ≈ esperado
    ["CO", "es-CO", 180, "COP", "≈ 33 709 COP"],
    ["CO", "en-US", 180, "COP", "≈ 33 709 COP"],   // el formato sigue la moneda, no el navegador
    ["MX", "es-MX", 180, "MXN", ""],
    ["US", "en-US", 180, "USD", "≈ 10.42 USD"],
    ["AR", "es-AR", 180, "ARS", null],
    ["ES", "es-ES", 299, "EUR", null],
    ["PE", "es-PE", 299, "PEN", null],
    ["CL", "es-CL", 299, "CLP", null],
    ["JP", "ja-JP", 299, "JPY", null],
    ["GB", "en-GB", 299, "GBP", null],
    ["EC", "es-EC", 299, "USD", null],
    ["PA", "es-PA", 299, "USD", null],
    ["DE", "de-DE", 299, "EUR", null],
    ["BR", "pt-BR", 299, "BRL", null],
  ];
  for (const [cc, lang, pesos, wantCcy, wantApprox] of casos) {
    const { VM, sb } = makeEnv({ lang, cc });
    await VM.init(sb);
    check(`${cc} moneda`, VM.currency(), wantCcy);
    const a = VM.approx(pesos);
    if (wantApprox !== null) check(`${cc} ≈`, a, wantApprox);
    // el importe en MXN SIEMPRE aparece
    checkTrue(`${cc} muestra el cargo en MXN`, VM.line(pesos).startsWith("$" + pesos.toLocaleString("es-MX") + " MXN"), `→ ${VM.line(pesos)}`);
    if (cc !== "MX") checkTrue(`${cc} lleva referencia ≈`, VM.line(pesos).includes("≈"), `→ ${VM.line(pesos)}`);
    console.log(`   ${cc.padEnd(3)} ${String(lang).padEnd(6)} ${VM.line(pesos)}`);
  }

  console.log("— 2. cobertura: TODOS los países mapeados tienen tasa");
  {
    const { VM, sb } = makeEnv({});
    await VM.init(sb);
    const missing = [];
    for (const [cc, code] of Object.entries(VM.countries)) {
      if (code !== "MXN" && !RATES[code]) missing.push(`${cc}→${code}`);
    }
    checkTrue("cada país tiene tasa disponible", missing.length === 0, missing.join(", "));
    check("número de países mapeados", Object.keys(VM.countries).length >= 240, true);
    const dupCheck = new Set(Object.values(VM.countries));
    console.log(`   ${Object.keys(VM.countries).length} países · ${dupCheck.size} monedas distintas · faltantes: ${missing.length}`);
  }

  console.log("— 3. sin tasa fresca NO se convierte (nunca un número inventado)");
  for (const [nombre, opts] of [
    ["servidor marca stale", { cc: "CO", stale: true }],
    ["tasa de hace 10 días", { cc: "CO", fetched: new Date(Date.now() - 10 * 864e5).toISOString() }],
    ["sin conexión (rpc falla)", { cc: "CO", rates: null }],
  ]) {
    const { VM, sb } = makeEnv(opts);
    const sbBad = opts.rates === null ? { rpc: () => ({ abortSignal: () => Promise.reject(new Error("net")) }) } : sb;
    await VM.init(sbBad);
    check(`${nombre} → moneda MXN`, VM.currency(), "MXN");
    check(`${nombre} → sin ≈`, VM.approx(180), "");
    check(`${nombre} → precio en pesos`, VM.line(180), "$180 MXN");
  }

  console.log("— 4. ARS: tasa de 3 días es demasiado vieja para una moneda volátil");
  {
    const { VM, sb } = makeEnv({ cc: "AR", fetched: new Date(Date.now() - 60 * 3600e3).toISOString() });
    await VM.init(sb);
    check("ARS con tasa de 60 h → sin conversión", VM.approx(180), "");
    check("ARS con tasa de 60 h → cae a MXN", VM.currency(), "MXN");
  }
  {
    const { VM, sb } = makeEnv({ cc: "AR", fetched: new Date().toISOString() });
    await VM.init(sb);
    checkTrue("ARS con tasa fresca sí convierte", VM.approx(180).includes("ARS"), VM.approx(180));
  }

  console.log("— 5. el ≈ SIEMPRE sale del MXN cobrado (nunca de otro precio)");
  {
    const { VM, sb } = makeEnv({ cc: "CO" });
    await VM.init(sb);
    const cop = VM.convert(299, "MXN", "COP");
    const viaUsd = VM.convert(VM.convert(299, "MXN", "USD"), "USD", "COP");
    checkTrue("MXN→COP == MXN→USD→COP", Math.abs(cop - viaUsd) < 0.01, `${cop} vs ${viaUsd}`);
    check("$299 MXN en COP", VM.approx(299), "≈ 55 995 COP");
    // el viejo cálculo (USD 19 del catálogo) daba otro número: eso era el bug
    const viejo = 19 * RATES.COP;
    checkTrue("el precio viejo en USD daba OTRA cifra", Math.round(viejo) !== Math.round(cop), `${Math.round(viejo)} vs ${Math.round(cop)}`);
    console.log(`   antes: ≈ ${Math.round(viejo).toLocaleString("es-CO")} COP (de USD 19) · ahora: ${VM.approx(299)} (del cargo real)`);
  }

  console.log("— 6. formato legible en cada convención");
  {
    for (const [cc, pesos] of [["CO", 180], ["CL", 850], ["PY", 88], ["JP", 8500], ["ES", 299], ["US", 299]]) {
      const { VM, sb } = makeEnv({ cc, lang: "es-" + cc });
      await VM.init(sb);
      const s = VM.approx(pesos);
      checkTrue(`${cc} sin decimales falsos`, !/[.,]\d{2}$/.test(s) || pesos < 100, s);
      checkTrue(`${cc} lleva el código ISO`, new RegExp(VM.currency()).test(s), s);
      checkTrue(`${cc} sin punto ni coma de miles (ambiguos)`, !/\d[.,]\d{3}\b/.test(s), s);
      console.log(`   ${cc}: ${VM.line(pesos)}`);
    }
  }

  console.log("— 7. moneda elegida a mano manda sobre la detección");
  {
    const { VM, sb } = makeEnv({ cc: "CO", ccy: "USD" });
    await VM.init(sb);
    check("respeta la elección guardada", VM.currency(), "USD");
    check("cambio manual a EUR", VM.setCurrency("EUR", true), "true");
    check("moneda tras el cambio", VM.currency(), "EUR");
    check("moneda inexistente se rechaza", VM.setCurrency("XXX", true), "false");
    check("sigue en EUR", VM.currency(), "EUR");
  }

  console.log("— 8. lectura de importes escritos a mano (el error de «33.000»)");
  {
    const { VM, sb } = makeEnv({});
    await VM.init(sb);
    const pares = [["33.000", 33000], ["33,000", 33000], ["1.234.567", 1234567], ["33,50", 33.5], ["33.50", 33.5],
                   ["$ 8.500 MXN", 8500], ["299", 299], ["0", 0], ["", null], ["abc", null], ["2500.75", 2500.75]];
    for (const [inp, want] of pares) check(`parseAmount("${inp}")`, VM.parseAmount(inp), want);
  }

  console.log("— 9. selector de moneda");
  {
    const { VM, sb } = makeEnv({ cc: "CO" });
    await VM.init(sb);
    const o = VM.options();
    checkTrue("primera opción = MXN", o[0].code === "MXN", o[0] && o[0].code);
    checkTrue("incluye COP", o.some(x => x.code === "COP"));
    checkTrue("todas las opciones son convertibles", o.every(x => x.code === "MXN" || !!RATES[x.code]));
    console.log(`   ${o.length} monedas ofrecidas · ej. ${o.slice(1, 4).map(x => x.label).join(" | ")}`);
  }

  console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} pruebas OK, ${fail} fallidas`);
  process.exit(fail === 0 ? 0 : 1);
})();
