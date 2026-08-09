/* La puerta de entrada — el pedazo que no puede fallar nunca.
   Prueba el bloque canónico VOCES-AUTH en navegador REAL (Brave), con las
   llamadas a Supabase interceptadas: no se manda un solo correo de verdad ni se
   toca producción.
      node tools/test-login.js [baseUrl]        (por omisión http://localhost:8899)
   En producción las rutas van sin .html:  node tools/test-login.js https://voces.world
*/
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8899";
const PROD = /^https?:\/\/(?!localhost)/.test(BASE);
const page_ = p => `${BASE}/${PROD ? p.replace(/\.html$/, "") : p}`;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n} ${extra}`); } };

const SESSION = {
  access_token: "fake.access.token", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "fake-refresh",
  user: { id: "00000000-0000-0000-0000-000000000001", email: "prueba@voces.test", aud: "authenticated", role: "authenticated" }
};

(async () => {
  const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
  const ctx = await browser.newContext();

  // Guion de respuestas: cada prueba dice qué debe contestar el servidor falso.
  let script = {};
  await ctx.route("**/auth/v1/**", async route => {
    const u = new URL(route.request().url());
    const p = u.pathname.replace("/auth/v1/", "");
    const key = p === "token" ? "token:" + (u.searchParams.get("grant_type") || "") : p;
    const r = script[key];
    // Un 200 vacío al refrescar hacía que supabase-js reintentara sin parar y la
    // página nunca quedaba «en reposo». Se responde que el token falso no sirve.
    if (!r && key === "token:refresh_token") return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid Refresh Token" }) });
    if (!r) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.fulfill({ status: r.status || 200, contentType: "application/json", body: JSON.stringify(r.body || {}) });
  });
  // Nada de datos reales en las pruebas de puerta.
  await ctx.route("**/rest/v1/**", r => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));

  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errores = [];
  page.on("pageerror", e => errores.push(String(e)));
  const txt = () => page.evaluate(() => document.body.innerText);
  // Cada caso arranca sin sesión: si no, la del caso anterior queda en
  // localStorage (mismo origen) y la página siguiente entra directo al panel.
  const limpio = async () => { await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (_) {} }); };
  const wait = ms => page.waitForTimeout(ms);

  /* ── 1. La puerta se dibuja y ofrece las dos formas de entrar ── */
  console.log("\n— La puerta");
  errores.length = 0;
  await page.goto(page_("mi-voz.html"), { waitUntil: "domcontentloaded" });
  await wait(500);
  ok("mi-voz carga sin errores de JS", errores.length === 0, errores[0] || "");
  ok("el bloque VOCES-AUTH está cargado", await page.evaluate(() => !!window.VA || typeof VA !== "undefined").catch(() => false));
  ok("ofrece «Con contraseña»", (await txt()).includes("Con contraseña"));
  ok("ofrece «Con código por correo»", (await txt()).includes("Con código por correo"));
  ok("ofrece recuperar la contraseña", (await txt()).includes("¿Olvidaste tu contraseña?"));

  /* ── 2. Contraseña equivocada: el callejón sin salida de antes ── */
  console.log("\n— Contraseña que no entra");
  script = { "token:password": { status: 400, body: { error: "invalid_grant", error_description: "Invalid login credentials", msg: "Invalid login credentials" } } };
  await page.fill("#gateBody input[name=email]", "prueba@voces.test");
  await page.fill("#gateBody input[name=pass]", "loquesea123");
  await page.click("#gateBody button[type=submit]");
  await wait(900);
  let t = await txt();
  ok("avisa en español, no en inglés", /Correo o contraseña incorrectos/.test(t), t.slice(0, 120));
  ok("ofrece salida: «Mándame un código»", /Mándame un código/.test(t));

  /* ── 3. La salida lleva al código y el código se pide ── */
  console.log("\n— Entrar por código");
  script["otp"] = { status: 200, body: {} };
  // el botón de rescate se cuelga del renglón del mensaje, que en mi-voz vive
  // FUERA de #gateBody (es #gateMsg) — por eso se busca en toda la página
  await page.click("button:has-text('Mándame un código')");
  await wait(300);
  await page.fill("#gateBody input[name=email]", "prueba@voces.test");
  await page.click("#gateBody button[type=submit]");
  await wait(900);
  t = await txt();
  ok("dice a qué correo lo mandó", t.includes("prueba@voces.test"));
  ok("avisa de la carpeta de spam", /spam/i.test(t));
  ok("pide un código de 8 dígitos", /8 dígitos/.test(t));
  ok("hay campo de código", await page.$("#gateBody input[name=code]") !== null);

  /* ── 4. Código vencido: mensaje claro, no un volcado técnico ── */
  script["verify"] = { status: 403, body: { error_code: "otp_expired", msg: "Token has expired or is invalid" } };
  await page.fill("#gateBody input[name=code]", "12345678");
  await page.click("#gateBody button[type=submit]");
  await wait(900);
  t = await txt();
  ok("un código vencido se explica en español", /venció|no es el correcto/.test(t), t.slice(0, 120));

  /* ── 5. Código bueno → como venía de «olvidé mi contraseña», pide una nueva ── */
  script["verify"] = { status: 200, body: SESSION };
  await page.fill("#gateBody input[name=code]", "87654321");
  await page.click("#gateBody button[type=submit]");
  await wait(900);
  t = await txt();
  ok("tras el código pide poner contraseña nueva", /Nueva contraseña/.test(t), t.slice(0, 140));
  ok("el mínimo que muestra es el que exige el servidor (10)",
    await page.evaluate(() => { const i = document.querySelector("#gateBody input[name=p1]"); return i && i.getAttribute("minlength") === "10"; }));

  /* ── 6. Una contraseña filtrada se explica, no se traga ── */
  console.log("\n— Contraseña nueva");
  script["user"] = { status: 422, body: { error_code: "weak_password", msg: "This password is known to be weak and easy to guess, please choose a different one (pwned)" } };
  await page.fill("#gateBody input[name=p1]", "contraseña1234");
  await page.fill("#gateBody input[name=p2]", "contraseña1234");
  await page.click("#gateBody button[type=submit]");
  await wait(900);
  t = await txt();
  ok("explica que la contraseña está filtrada", /filtraciones/.test(t), t.slice(0, 140));

  /* ── 7. Traducciones y reglas, sin navegar ── */
  console.log("\n— Reglas del bloque");
  const unit = await page.evaluate(() => ({
    min: VA.MIN_PW,
    corta: (() => { try { VA.checkPw("corta"); return "no falló"; } catch (e) { return e.message; } })(),
    distintas: (() => { try { VA.checkPw("unabuenacontraseña", "otra"); return "no falló"; } catch (e) { return e.message; } })(),
    sinCuenta: VA.msg({ message: "Signups not allowed for otp" }),
    muchos: VA.msg({ message: "For security purposes, you can only request this after 41 seconds." }),
    here: VA.here()
  }));
  ok("el mínimo canónico es 10", unit.min === 10);
  ok("una contraseña corta se rechaza antes de la red", /al menos 10/.test(unit.corta), unit.corta);
  ok("dos contraseñas distintas se rechazan", /no coinciden/.test(unit.distintas), unit.distintas);
  ok("«no existe esa cuenta» se dice en español", /No encontramos una cuenta/.test(unit.sinCuenta), unit.sinCuenta);
  ok("«pediste muchos códigos» se dice en español", /Espera un minuto|varios códigos/.test(unit.muchos), unit.muchos);
  ok("el destino de vuelta es esta misma página, sin .html", /\/mi-voz$/.test(unit.here), unit.here);

  /* ── 8. El enlace del correo aterrizando aquí (?token_hash) ── */
  console.log("\n— Volver desde el enlace del correo");
  script["verify"] = { status: 200, body: SESSION };
  errores.length = 0;
  await page.goto(page_("mi-voz.html") + "?token_hash=abc123&type=magiclink", { waitUntil: "domcontentloaded" });
  await wait(1200);
  ok("el enlace del correo se canjea sin errores", errores.length === 0, errores[0] || "");
  ok("la URL queda limpia (el token no se queda en la barra)",
    await page.evaluate(() => !location.search.includes("token_hash")));

  script["verify"] = { status: 403, body: { error_code: "otp_expired", msg: "Token has expired or is invalid" } };
  await limpio();
  await page.goto(page_("mi-voz.html") + "?token_hash=viejo&type=magiclink", { waitUntil: "domcontentloaded" });
  await wait(1200);
  t = await txt();
  ok("un enlace vencido devuelve a la puerta con una salida", /venció|no es el correcto/.test(t) && /código/i.test(t), t.slice(0, 160));

  /* ── 9. El panel de Mónica usa la misma puerta ── */
  console.log("\n— /admin");
  await limpio();
  errores.length = 0;
  await page.goto(page_("admin.html"), { waitUntil: "domcontentloaded" });
  await wait(700);
  t = await txt();
  ok("admin carga sin errores de JS", errores.length === 0, errores[0] || "");
  ok("admin ofrece las dos formas de entrar", t.includes("Con contraseña") && t.includes("Con código por correo"));

  /* ── 10. El alta pública: correo que ya tiene cuenta ── */
  console.log("\n— /crear-perfil");
  await limpio();
  errores.length = 0;
  await page.goto(page_("crear-perfil.html"), { waitUntil: "domcontentloaded" });
  await wait(900);
  ok("crear-perfil carga sin errores de JS", errores.length === 0, errores[0] || "");
  ok("la contraseña que pide es de 10, no de 8",
    await page.evaluate(() => { const i = document.getElementById("f_pass"); return i && i.getAttribute("minlength") === "10"; }));
  await page.evaluate(() => { openLoginGate("yatengo@voces.test", "Ese correo ya tiene cuenta."); });
  await wait(500);
  t = await txt();
  ok("la puerta de rescate se abre encima del formulario", /Entra a tu cuenta/.test(t));
  ok("y abre directamente en el modo código", /8 dígitos/.test(t), t.slice(0, 160));

  await browser.close();
  console.log(`\n${fail ? "❌" : "✅"}  ${pass} comprobaciones OK, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
