/* Panel de administración: pruebas en navegador REAL (Brave) con sesión y datos
   SIMULADOS — no toca producción ni necesita la contraseña de Mónica.
   Se interceptan las llamadas a Supabase y se sirven datos de prueba; el código
   de la página corre tal cual se sirve.
   Uso:  node tools/test-admin.js [baseUrl]   (por defecto http://localhost:8899) */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8899";
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const REF = "fgsrcxxccdjqyrpkitmk";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; } else { fail++; console.log(`  ✗ ${n} ${extra}`); } };

// ---------------- datos de prueba ----------------
const CATS = [
  { id: "cat-perdon", name_es: "Perdón y Duelo", name_en: "Forgiveness", sort_order: 1, status: "published" },
  { id: "cat-finanzas", name_es: "Finanzas y Nueva Economía", name_en: "Finance", sort_order: 2, status: "published" },
];
const SPECS = [
  { id: "sp-1", name: "Ana Ruiz", status: "published", sort_order: 1, category_id: "cat-perdon", contact_email: "ana@example.com", contact_phone: "+52 55 1111 1111", country: "MX", fbid_user: "u1" },
  { id: "sp-2", name: "Beto Lima", status: "published", sort_order: 2, category_id: "cat-finanzas", contact_email: "beto@example.com", contact_phone: "+57 300 222 2222", country: "CO", fbid_user: null },
  { id: "sp-3", name: "Caro Díaz", status: "published", sort_order: 3, category_id: "cat-perdon", contact_email: "", contact_phone: "", country: "AR", fbid_user: null },
];
const OFFS = [
  { id: "of-1", title: "Ebook del perdón", kind: "ebook", status: "published", sort_order: 1, specialist_id: "sp-1", price_cents: 8800 },
  { id: "of-2", title: "Sesión de duelo", kind: "sesion_individual", status: "published", sort_order: 2, specialist_id: "sp-1", price_cents: 80000 },
  { id: "of-3", title: "Curso de finanzas", kind: "curso", status: "published", sort_order: 3, specialist_id: "sp-2", price_cents: 250000 },
  { id: "of-4", title: "Retiro nuevo (en revisión)", kind: "retiro", status: "pending", sort_order: 0, specialist_id: "sp-2", price_cents: 500000 },
  { id: "of-5", title: "Borrador viejo", kind: "libro", status: "draft", sort_order: 1, specialist_id: "sp-3", price_cents: 20000 },
];
const GROUPS = [
  { id: "g-1", buyer_email: "clienta@example.com", buyer_name: "Clienta Uno", status: "paid", total_cents: 88800, subtotal_cents: 88800, discount_cents: 0, created_at: "2026-08-01T10:00:00Z", is_test: false },
  { id: "g-2", buyer_email: "CLIENTA@example.com", buyer_name: "", status: "paid", total_cents: 250000, subtotal_cents: 250000, discount_cents: 0, created_at: "2026-08-04T10:00:00Z", is_test: false },
  { id: "g-3", buyer_email: "otro@example.com", buyer_name: "Otro Dos", status: "awaiting_payment", total_cents: 80000, subtotal_cents: 80000, discount_cents: 0, created_at: "2026-08-05T10:00:00Z", is_test: false },
  { id: "g-4", buyer_email: "prueba@example.com", buyer_name: "No debe salir", status: "paid", total_cents: 100, subtotal_cents: 100, discount_cents: 0, created_at: "2026-08-05T11:00:00Z", is_test: true },
];
const ITEMS = [
  { id: "i-1", group_id: "g-1", item_type: "offering", item_id: "of-1", title: "Ebook del perdón", qty: 1, unit_cents: 8800, specialist_id: "sp-1", platform_cents: 1760, specialist_cents: 7040 },
  { id: "i-2", group_id: "g-2", item_type: "offering", item_id: "of-3", title: "Curso de finanzas", qty: 1, unit_cents: 250000, specialist_id: "sp-2", platform_cents: 50000, specialist_cents: 200000 },
  { id: "i-3", group_id: "g-3", item_type: "offering", item_id: "of-2", title: "Sesión de duelo", qty: 1, unit_cents: 80000, specialist_id: "sp-1", platform_cents: 16000, specialist_cents: 64000 },
  { id: "i-4", group_id: "g-4", item_type: "offering", item_id: "of-1", title: "Ebook del perdón", qty: 1, unit_cents: 100, specialist_id: "sp-1", platform_cents: 20, specialist_cents: 80 },
];

const reorders = [];   // lo que la página mandó a vpa_reorder
const upserts  = [];   // lo que la página mandó a vpa_upsert_offering (duplicar)

async function stub(ctx) {
  const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  await ctx.route(`**/${REF}.supabase.co/**`, async route => {
    const url = route.request().url();
    const body = (() => { try { return JSON.parse(route.request().postData() || "{}"); } catch (_) { return {}; } })();
    if (url.includes("/auth/v1/user")) return json(route, { id: "monica", email: "monica@example.com", aud: "authenticated", role: "authenticated" });
    if (url.includes("/auth/v1/")) return json(route, {});
    if (url.includes("/rpc/vpa_ensure_member") || url.includes("/rpc/vpa_my_role")) return json(route, "super_admin");
    if (url.includes("/rpc/vpa_reorder")) { reorders.push(body); return json(route, null); }
    if (url.includes("/rpc/vpa_upsert_offering")) {
      upserts.push(body.payload);
      // la copia entra en la lista, como haría la base: así el 2º duplicado ve
      // que «(copia)» ya está ocupada y tiene que llamarse «(copia 2)»
      OFFS.push(Object.assign({}, body.payload, { id: "of-new-" + upserts.length }));
      return json(route, "of-new-" + upserts.length);
    }
    if (url.includes("/rpc/")) return json(route, null);
    if (url.includes("app_vpa_specialists")) return json(route, SPECS);
    if (url.includes("app_vpa_offerings")) return json(route, OFFS);
    if (url.includes("app_vpa_categories")) return json(route, CATS);
    if (url.includes("app_vpa_order_groups")) return json(route, GROUPS);
    if (url.includes("app_vpa_order_items")) return json(route, ITEMS);
    if (url.includes("app_vpa_plans")) return json(route, []);
    return json(route, []);
  });
}

const sesion = {
  access_token: "fake", token_type: "bearer", refresh_token: "fake",
  expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "monica", email: "monica@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} },
};

(async () => {
  const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
  const ctx = await browser.newContext({ locale: "es-MX", viewport: { width: 1280, height: 900 } });
  await stub(ctx);
  await ctx.addInitScript(([ref, s]) => {
    try { localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s)); localStorage.setItem("vpa_cc", "MX"); } catch (_) {}
  }, [REF, sesion]);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", e => errores.push(String(e)));
  // En producción Cloudflare sirve /admin (sin .html) y redirige el .html a vacío.
  const RUTA = BASE.includes("localhost") ? "/admin.html" : "/admin";
  await page.goto(`${BASE}${RUTA}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(800);
  ok("entra al panel (sesión simulada)", await page.isVisible("#app"), await page.innerText("#login").catch(() => ""));

  // ---------------- TEMA 1 · arrastrar para reordenar ----------------
  console.log("— Reordenar arrastrando");
  await page.evaluate(() => go("specialists"));
  await page.waitForTimeout(500);
  ok("cada fila tiene asa de arrastre", await page.$$eval("#rows .card .drag", e => e.length) === 3);
  ok("se ve la posición 1,2,3", (await page.$$eval("#rows .pos", e => e.map(x => x.textContent))).join("") === "123");
  ok("hay aviso de cómo reordenar", await page.isVisible("#dragTip"));

  // arrastre real: dragstart en la 3ª fila, dragover sobre la 1ª, dragend
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#rows .card")];
    const src = cards[2], dst = cards[0];
    src.draggable = true;
    src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: new DataTransfer() }));
    const r = dst.getBoundingClientRect();
    dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, clientY: r.top + 2, dataTransfer: new DataTransfer() }));
    src.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: new DataTransfer() }));
  });
  await page.waitForTimeout(500);
  const orden1 = await page.$$eval("#rows .card", e => e.map(c => c.dataset.id));
  ok("la fila arrastrada quedó arriba", orden1.join(",") === "sp-3,sp-1,sp-2", orden1.join(","));
  ok("se guardó en el servidor", reorders.length === 1 && reorders[0].p_entity === "specialist", JSON.stringify(reorders[0]));
  ok("se mandó el orden completo", (reorders[0] || {}).p_ids?.join(",") === "sp-3,sp-1,sp-2", JSON.stringify((reorders[0] || {}).p_ids));
  ok("los números se renumeraron solos", (await page.$$eval("#rows .pos", e => e.map(x => x.textContent))).join("") === "123");

  // flechas (tableta / teclado)
  await page.evaluate(() => moveRow("specialists", "sp-2", -1));
  await page.waitForTimeout(400);
  const orden2 = await page.$$eval("#rows .card", e => e.map(c => c.dataset.id));
  ok("la flecha ▲ sube una fila", orden2.join(",") === "sp-3,sp-2,sp-1", orden2.join(","));
  ok("también se guardó", reorders.length === 2 && reorders[1].p_ids.join(",") === "sp-3,sp-2,sp-1");

  // ---------------- ofertas: lo pendiente, al final ----------------
  console.log("— Ofertas: lo pendiente se va al final");
  await page.evaluate(() => go("offerings"));
  await page.waitForTimeout(600);
  const ofOrden = await page.$$eval("#rows .card", e => e.map(c => c.dataset.id));
  ok("publicadas primero, pendientes al final", ofOrden.join(",") === "of-1,of-2,of-3,of-4,of-5", ofOrden.join(","));
  const fijas = await page.$$eval("#rows .card", e => e.filter(c => c.dataset.fixed === "1").map(c => c.dataset.id));
  ok("lo no publicado no se puede arrastrar", fijas.join(",") === "of-4,of-5", fijas.join(","));
  ok("su asa está deshabilitada", await page.$$eval('#rows .card[data-fixed="1"] .drag', e => e.every(b => b.disabled)));
  ok("las publicadas sí tienen flechas", await page.$$eval("#rows .card:not([data-fixed]) .arrows", e => e.length) === 3);
  ok("el aviso menciona lo pendiente", (await page.innerText("#dragTip")).includes("pendiente"));

  // arrastrar una publicada NO debe colar nada por debajo de las pendientes
  await page.evaluate(() => moveRow("offerings", "of-3", -1));
  await page.waitForTimeout(400);
  const ofOrden2 = await page.$$eval("#rows .card", e => e.map(c => c.dataset.id));
  ok("se reordenan sólo las publicadas", ofOrden2.join(",") === "of-1,of-3,of-2,of-4,of-5", ofOrden2.join(","));
  const ultimo = reorders[reorders.length - 1];
  ok("el servidor recibe pendientes al final", ultimo.p_ids.slice(-2).join(",") === "of-4,of-5", ultimo.p_ids.join(","));
  await page.evaluate(() => moveRow("offerings", "of-3", 1));   // vuelve a su sitio
  await page.waitForTimeout(300);

  // ---------------- Duplicar oferta ----------------
  // La misma oferta en doce fechas: se copia y sólo se cambia lo que cambia.
  console.log("— Duplicar oferta");
  await page.evaluate(() => go("offerings"));
  await page.waitForTimeout(600);
  ok("cada oferta tiene botón Duplicar",
    (await page.$$eval("#rows .card .acts button", e => e.filter(b => b.textContent.includes("Duplicar")).length)) === 5);

  await page.evaluate(() => dupFromList("of-1"));
  await page.waitForTimeout(700);
  const c1 = upserts[0] || {};
  ok("la copia nace en borrador", c1.status === "draft", JSON.stringify(c1.status));
  ok("el título dice (copia)", c1.title === "Ebook del perdón (copia)", c1.title);
  ok("no arrastra el id del original", c1.id === undefined, String(c1.id));
  ok("conserva la voz dueña", c1.specialist_id === "sp-1", c1.specialist_id);
  ok("conserva tipo y precio", c1.kind === "ebook" && c1.price_cents === 8800, `${c1.kind}/${c1.price_cents}`);

  await page.evaluate(() => dupFromList("of-1"));
  await page.waitForTimeout(700);
  ok("la segunda copia se llama (copia 2)", (upserts[1] || {}).title === "Ebook del perdón (copia 2)", (upserts[1] || {}).title);
  await page.evaluate(() => dupFromList("of-new-1"));   // duplicar una copia
  await page.waitForTimeout(700);
  ok("duplicar una copia no encadena «(copia) (copia)»",
    (upserts[2] || {}).title === "Ebook del perdón (copia 3)", (upserts[2] || {}).title);

  // el botón del formulario: sólo con una oferta ya creada delante
  await page.evaluate(() => openForm("offerings"));
  await page.waitForTimeout(300);
  ok("al crear una oferta nueva NO se ofrece duplicar", await page.isHidden("#dupBtn"));
  await page.evaluate(it => openForm("offerings", it), OFFS.find(o => o.id === "of-3"));
  await page.waitForTimeout(400);
  ok("al editar una existente SÍ se ofrece duplicar", await page.isVisible("#dupBtn"));
  await page.click("#dupBtn");
  await page.waitForTimeout(700);
  const cf = upserts[3] || {};
  ok("duplicar desde el formulario copia lo que está en pantalla",
    cf.status === "draft" && cf.title === "Curso de finanzas (copia)" && cf.specialist_id === "sp-2",
    JSON.stringify([cf.status, cf.title, cf.specialist_id]));
  ok("y cierra el formulario", await page.evaluate(() => !$("drawer").classList.contains("open")));
  await page.evaluate(() => go("offerings"));
  await page.waitForTimeout(500);

  // ---------------- TEMA 2 · directorio de voces ----------------
  console.log("— Directorio de voces");
  await page.evaluate(() => go("directory"));
  await page.waitForTimeout(700);
  const dirTxt = await page.innerText("#dirBox");
  ok("lista las 3 voces", (await page.$$eval("#dirBox .card", e => e.length)) === 3);
  ok("muestra correo", dirTxt.includes("ana@example.com") && dirTxt.includes("beto@example.com"));
  ok("muestra teléfono", dirTxt.includes("+52 55 1111 1111"));
  ok("avisa de quien no tiene contacto", dirTxt.includes("no le llegarán los comunicados"));
  ok("teléfono enlaza a WhatsApp", (await page.getAttribute('#dirBox a[href^="https://wa.me/"]', "href")).includes("525511111111"));
  const dirMails = await page.evaluate(() => DIRDATA.voces.emails);
  ok("junta sólo los correos que existen", dirMails.join(",") === "ana@example.com,beto@example.com", dirMails.join(","));
  await page.fill("#dirQ", "beto");
  await page.waitForTimeout(300);
  ok("el buscador filtra", (await page.$$eval("#dirBox .card", e => e.length)) === 1);
  ok("y los correos siguen a la vista filtrada", (await page.evaluate(() => DIRDATA.voces.emails)).join(",") === "beto@example.com");
  const csvVoces = await page.evaluate(() => DIRDATA.voces.csv);
  ok("el CSV lleva encabezados y datos", csvVoces[0][0] === "Nombre" && csvVoces[1][1] === "beto@example.com", JSON.stringify(csvVoces[1]));

  // ---------------- TEMA 2 · compradores ----------------
  console.log("— Compradores");
  await page.evaluate(() => go("buyers"));
  await page.waitForTimeout(900);
  let txt = await page.innerText("#buyBox");
  ok("agrupa por persona (mismo correo, 2 compras)", (await page.$$eval("#buyBox .card", e => e.length)) === 1, txt.slice(0, 120));
  ok("no cuenta los pedidos de prueba", !txt.includes("No debe salir"));
  ok("no mezcla los pendientes de pago", !txt.includes("Otro Dos"));
  ok("muestra qué compró", txt.includes("Ebook del perdón") && txt.includes("Curso de finanzas"));
  ok("etiqueta el tipo", txt.includes("Ebook") && txt.includes("Curso"));
  ok("etiqueta la temática", txt.includes("Perdón y Duelo") && txt.includes("Finanzas"));

  await page.selectOption("#buyFilters select >> nth=0", "cat-perdon");
  await page.waitForTimeout(400);
  txt = await page.innerText("#buyBox");
  ok("filtra por temática", txt.includes("Ebook del perdón") && !txt.includes("Curso de finanzas"), txt.slice(0, 160));
  await page.selectOption("#buyFilters select >> nth=0", "");
  await page.selectOption("#buyFilters select >> nth=1", "curso");
  await page.waitForTimeout(400);
  txt = await page.innerText("#buyBox");
  ok("filtra por tipo de producto", txt.includes("Curso de finanzas") && !txt.includes("Ebook del perdón"), txt.slice(0, 160));
  await page.selectOption("#buyFilters select >> nth=1", "");
  await page.selectOption("#buyFilters select >> nth=2", "pendientes");
  await page.waitForTimeout(400);
  txt = await page.innerText("#buyBox");
  ok("puede ver los pendientes de pago", txt.includes("Otro Dos"), txt.slice(0, 160));
  await page.selectOption("#buyFilters select >> nth=2", "pagados");
  await page.waitForTimeout(300);
  const buyMails = await page.evaluate(() => DIRDATA.compradores.emails);
  ok("los correos salen sin duplicar", buyMails.join(",") === "clienta@example.com", buyMails.join(","));
  const csvComp = await page.evaluate(() => DIRDATA.compradores.csv);
  ok("el CSV de compradores trae temática y tipo", csvComp[0].includes("Temáticas") && csvComp[1][5].includes("Perdón"), JSON.stringify(csvComp[1]));

  ok("sin errores de JS en todo el recorrido", errores.length === 0, errores.slice(0, 3).join(" | "));

  await browser.close();
  console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} comprobaciones OK, ${fail} fallidas`);
  process.exit(fail === 0 ? 0 : 1);
})();
