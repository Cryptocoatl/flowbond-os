/* Panales privados + alta pública: que carguen sin errores y que el precio
   escrito a mano se entienda bien.  node tools/test-panels.js [baseUrl] */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8899";
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; } else { fail++; console.log(`  ✗ ${n} ${extra}`); } };

(async () => {
  const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
  const ctx = await browser.newContext({ locale: "es-CO", timezoneId: "America/Bogota" });
  await ctx.addInitScript(() => { try { localStorage.setItem("vpa_cc", "CO"); } catch (_) {} });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", e => errores.push(String(e)));

  for (const p of ["mi-voz.html", "admin.html", "crear-perfil.html", "biblioteca.html", "registro.html", "conectar-mp.html"]) {
    errores.length = 0;
    await page.goto(`${BASE}/${p}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(900);
    ok(`${p} sin errores de JS`, errores.length === 0, errores.slice(0, 2).join(" | "));
    const vm = await page.evaluate(() => !!window.VM);
    if (["mi-voz.html", "admin.html", "crear-perfil.html"].includes(p)) {
      ok(`${p} tiene el bloque de moneda`, vm);
      const sane = await page.evaluate(() => [VM.mxn(33000), VM.parseAmount("33.000"), VM.parseAmount("33,50"), VM.ccyForCountry("CO"), VM.ccyForCountry("KE")]);
      ok(`${p} lee «33.000» como 33 mil`, sane[1] === 33000, JSON.stringify(sane));
      ok(`${p} lee «33,50» como 33.5`, sane[2] === 33.5);
      ok(`${p} país→moneda`, sane[3] === "COP" && sane[4] === "KES", JSON.stringify(sane.slice(3)));
    }
    console.log(`   ${p.padEnd(18)} ok`);
  }

  // --- alta pública: escribir «33.000» en el precio y ver qué queda registrado
  await page.goto(`${BASE}/crear-perfil.html`, { waitUntil: "networkidle", timeout: 45000 });
  const eco = await page.evaluate(() => {
    if (typeof OFFERS === "undefined") return "sin-OFFERS";
    OFFERS.length = 0;
    addOffer("ebook");
    const inp = { value: "33.000", type: "text" };
    upOffer(0, "price_mxn", inp);
    return String(OFFERS[0].price_mxn);
  });
  ok("crear-perfil registra 33000, no 33", eco === "33000", `→ ${eco}`);

  await browser.close();
  console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} comprobaciones OK, ${fail} fallidas`);
  process.exit(fail === 0 ? 0 : 1);
})();
