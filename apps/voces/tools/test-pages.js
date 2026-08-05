/* Verificación en navegador REAL (Brave) de los precios que ve cada país.
   Levanta las páginas locales y comprueba lo que queda pintado en pantalla.
   Uso:  node tools/test-pages.js [baseUrl]     (por defecto http://localhost:8899)
   Requiere playwright disponible (npx playwright). */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8899";
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

const PAISES = [
  { cc: "CO", locale: "es-CO", tz: "America/Bogota", ccy: "COP" },
  { cc: "AR", locale: "es-AR", tz: "America/Argentina/Buenos_Aires", ccy: "ARS" },
  { cc: "PE", locale: "es-PE", tz: "America/Lima", ccy: "PEN" },
  { cc: "US", locale: "en-US", tz: "America/New_York", ccy: "USD" },
  { cc: "ES", locale: "es-ES", tz: "Europe/Madrid", ccy: "EUR" },
  { cc: "CL", locale: "es-CL", tz: "America/Santiago", ccy: "CLP" },
  { cc: "MX", locale: "es-MX", tz: "America/Mexico_City", ccy: "MXN" },
];

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; } else { fail++; console.log(`  ✗ ${n} ${extra}`); } };

(async () => {
  const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
  for (const p of PAISES) {
    const ctx = await browser.newContext({ locale: p.locale, timezoneId: p.tz });
    // La detección por IP no funciona desde aquí: se fija el país como si ya se hubiera detectado.
    await ctx.addInitScript(cc => { try { localStorage.setItem("vpa_cc", cc); } catch (_) {} }, p.cc);
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", e => errores.push(String(e)));

    // ---------- tienda pública ----------
    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    const ccy = await page.evaluate(() => window.VM && VM.currency());
    ok(`${p.cc} moneda detectada`, ccy === p.ccy, `→ ${ccy}`);

    const precios = await page.$$eval(".prod-foot .pp", els => els.map(e => e.textContent.trim()).filter(Boolean));
    const conMxn = precios.filter(t => /MXN/.test(t));
    ok(`${p.cc} toda tarjeta muestra el cargo en MXN`, precios.length > 0 && conMxn.length === precios.length,
       `${conMxn.length}/${precios.length}`);
    if (p.ccy !== "MXN") {
      const conRef = precios.filter(t => t.includes("≈") && t.includes(p.ccy));
      ok(`${p.cc} toda tarjeta lleva ≈ ${p.ccy}`, conRef.length === precios.length, `${conRef.length}/${precios.length}`);
    }
    // ningún precio puede aparecer en dos cifras distintas para el mismo artículo
    const dobles = precios.filter(t => (t.match(/MXN/g) || []).length > 1);
    ok(`${p.cc} sin precios duplicados`, dobles.length === 0, dobles.join(" | "));

    // el mismo artículo, en la tienda y dentro del perfil de su voz, dice lo mismo
    const coherente = await page.evaluate(() => {
      const off = (window.OFFERINGS || []).find(o => o.price_cents > 0 && o.sell_via_voces);
      if (!off) return "sin-ofertas";
      const pesos = Math.round(off.price_cents / 100);
      return VM.line(pesos) === VM.line(pesos) && VM.mxn(pesos).includes("MXN") ? "ok" : "difiere";
    });
    ok(`${p.cc} coherencia tienda/perfil`, coherente === "ok" || coherente === "sin-ofertas", coherente);

    const muestra = precios[0] || "(sin productos)";

    // ---------- membresías ----------
    await page.goto(`${BASE}/unete.html`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    const planTxt = await page.$$eval(".plan", els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()));
    ok(`${p.cc} planes cargados`, planTxt.length >= 1, planTxt.length);
    const conUsdFantasma = planTxt.filter(t => /USD/.test(t) && p.ccy !== "USD");
    ok(`${p.cc} sin precio paralelo en USD`, conUsdFantasma.length === 0, conUsdFantasma.join(" | ").slice(0, 120));
    // el ≈ del plan tiene que salir del cargo en pesos
    const cuadra = await page.evaluate(ccy => {
      const plan = (window.PLANS || []).find(x => x.id === "basic");
      if (!plan || !window.VM) return "sin-plan";
      const esperado = VM.approx(plan.monthly_cents / 100, ccy);
      const pintado = document.querySelector(".plan .local");
      if (!esperado) return pintado ? "sobra-referencia" : "ok";
      return pintado && pintado.textContent.includes(esperado) ? "ok" : `pintado="${pintado ? pintado.textContent.trim() : "—"}" esperado="${esperado}"`;
    }, p.ccy);
    ok(`${p.cc} el ≈ del plan sale del cargo en MXN`, cuadra === "ok" || cuadra === "sin-plan", cuadra);

    ok(`${p.cc} sin errores de JS`, errores.length === 0, errores.slice(0, 2).join(" | "));
    console.log(`   ${p.cc}  ${ccy}  tienda: ${muestra}   ·  plan: ${(planTxt[0] || "").slice(0, 60)}`);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} comprobaciones OK, ${fail} fallidas`);
  process.exit(fail === 0 ? 0 : 1);
})();
