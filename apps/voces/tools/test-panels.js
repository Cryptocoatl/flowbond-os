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

  // --- mi-voz · duplicar una oferta -----------------------------------------
  // Sin sesión real: se le pone a la página un perfil de mentira y se le cambia
  // `sb.rpc` por un espía, para ver EXACTAMENTE qué payload manda al servidor.
  await page.goto(`${BASE}/mi-voz.html`, { waitUntil: "networkidle", timeout: 45000 });
  errores.length = 0;
  const dup = await page.evaluate(async () => {
    const OFERTA = { id:"o1", slug:"taller-luna", status:"published", created_at:"2026-01-01", updated_at:"2026-02-02",
      specialist_id:"sp-1", kind:"taller", title:"Exploración Nexus", description:"desc", note_important:"ojo",
      price_cents:150000, currency:"MXN", cover_url:"http://x/c.jpg", booking_url:"https://cal/x",
      event_at:"2026-09-05T19:00:00Z", sell_via_voces:false, in_progress:false };
    ME = { id:"sp-1", offerings:[OFERTA], subscription:{ plan_id:"basic", status:"active" } };
    const enviados = [];
    sb.rpc = async (fn, args) => {
      enviados.push([fn, args]);
      if (fn === "vpa_my_profile") return { data: ME };
      if (fn === "vpa_upsert_offering") {
        ME.offerings.push(Object.assign({}, args.payload, { id: "o" + (ME.offerings.length + 1), status: "pending" }));
        return { data: "o2" };
      }
      return { data: null };
    };
    await RENDER.oferta();
    await dupMyOffer("o1");
    await dupMyOffer("o1");
    const p1 = (enviados.find(e => e[0] === "vpa_upsert_offering") || [])[1].payload;
    const p2 = enviados.filter(e => e[0] === "vpa_upsert_offering")[1][1].payload;
    return { p1, t2: p2.title, filas: document.querySelectorAll("#rows .card").length,
             etiquetas: [...document.querySelectorAll("#rows .pill")].map(e => e.textContent) };
  });
  ok("mi-voz: la copia no lleva id ni estado (lo pone el servidor)",
    dup.p1.id === undefined && dup.p1.status === undefined, JSON.stringify([dup.p1.id, dup.p1.status]));
  ok("mi-voz: el título dice (copia)", dup.p1.title === "Exploración Nexus (copia)", dup.p1.title);
  ok("mi-voz: copia precio, fecha, agenda y nota",
    dup.p1.price_cents === 150000 && dup.p1.event_at === "2026-09-05T19:00:00Z" &&
    dup.p1.booking_url === "https://cal/x" && dup.p1.note_important === "ojo", JSON.stringify(dup.p1));
  ok("mi-voz: no arrastra el slug del original (se genera solo)", dup.p1.slug === undefined, String(dup.p1.slug));
  ok("mi-voz: la segunda copia se llama (copia 2)", dup.t2 === "Exploración Nexus (copia 2)", dup.t2);
  ok("mi-voz: las copias aparecen en la lista", dup.filas === 3, String(dup.filas));
  ok("mi-voz: los estados se leen en español", dup.etiquetas.join(",") === "publicada,pendiente,pendiente", dup.etiquetas.join(","));
  ok("mi-voz: duplicar no lanza errores de JS", errores.length === 0, errores.slice(0, 2).join(" | "));

  await browser.close();
  console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} comprobaciones OK, ${fail} fallidas`);
  process.exit(fail === 0 ? 0 : 1);
})();
