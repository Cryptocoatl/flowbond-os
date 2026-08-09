/* ─────────────────────────────────────────────────────────────────────────
   VOCES · IDENTIDAD — bloque canónico.
   Se edita AQUÍ (tools/voces-auth.js) y se inyecta en las páginas con
   `node tools/sync-auth.js`, entre los marcadores VOCES-AUTH:BEGIN/END.
   NO editar la copia que vive dentro del HTML.

   POR QUÉ EXISTE
   Durante meses la única puerta de Voces fue la contraseña. Quien la olvidaba
   se quedaba fuera para siempre, porque el correo de «recuperar contraseña» de
   Supabase viaja por PKCE: exige abrir el enlace en el MISMO navegador que lo
   pidió. Desde el correo del teléfono eso casi nunca pasa (el correo abre su
   propio navegador interno), así que el enlace fallaba en silencio y devolvía
   a la pantalla de entrar.

   La puerta que NO puede fallar es el CÓDIGO de 8 dígitos: viaja en el mismo
   correo que el enlace mágico y no depende de nada — ni de redirecciones, ni de
   la lista de dominios permitidos de Supabase, ni del reenviador del hub FBID,
   ni de que sea el mismo navegador, ni el mismo aparato. Se teclea y entra.
   Por eso el código es el camino de rescate de TODAS las pantallas de Voces.

   La cuenta es la misma identidad FlowBond (FBID) que en el resto del
   ecosistema: mismo proyecto Supabase, mismo correo, misma contraseña.
   ───────────────────────────────────────────────────────────────────────── */
const VA = (function () {
  // El servidor exige 10 y además rechaza contraseñas aparecidas en filtraciones
  // conocidas (HIBP activo). Si la pantalla dice 8, la persona escribe 8 y el
  // servidor la rechaza sin que ella entienda por qué — así que aquí manda 10.
  const MIN_PW = 10;
  const REENVIO_S = 60; // smtp_max_frequency del proyecto

  /* ---------- errores en español (lo que llega de Supabase es técnico e inglés) ---------- */
  function msg(e) {
    const m = (e && (e.message || e.error_description || e.error || "")) + "";
    const code = (e && e.code) || "";
    if (/Invalid login credentials/i.test(m))
      return "Correo o contraseña incorrectos. Si no la recuerdas, entra con un código.";
    if (/Signups not allowed for otp|User not found|user_not_found/i.test(m) || code === "otp_disabled")
      return "No encontramos una cuenta con ese correo. Revisa que esté bien escrito.";
    if (/already registered|email_exists/i.test(m))
      return "Ese correo ya tiene cuenta. Entra con tu código y sigue desde ahí.";
    if (/rate limit|too many requests|only request this after|security purposes/i.test(m))
      return "Pediste varios códigos seguidos. Espera un minuto e inténtalo otra vez.";
    if (/expired|invalid.*(token|otp)|otp_expired|Token has expired/i.test(m))
      return "Ese código ya venció o no es el correcto. Pide uno nuevo.";
    if (/pwned|compromised|data breach|leaked/i.test(m))
      return "Esa contraseña aparece en filtraciones públicas conocidas. Elige otra distinta.";
    if (/weak|at least .*characters|should be at least/i.test(m) || code === "weak_password")
      return "Contraseña muy débil. Usa al menos " + MIN_PW + " caracteres y que no sea una común.";
    if (/should be different|same_password/i.test(m))
      return "La contraseña nueva tiene que ser distinta de la anterior.";
    if (/Failed to fetch|NetworkError|network/i.test(m))
      return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    if (/Email not confirmed/i.test(m))
      return "Tu correo aún no está confirmado. Entra con un código y queda confirmado.";
    return m || "Algo salió mal. Inténtalo de nuevo.";
  }

  /* ---------- operaciones ---------- */

  // A dónde tiene que devolvernos el enlace del correo: ESTA página, no el hub.
  // CF Pages sirve /mi-voz y /mi-voz.html; se normaliza a la ruta limpia porque
  // es la que está registrada en las dos listas de permitidos (Supabase + hub).
  function here() {
    let p = location.pathname.replace(/\.html$/, "");
    if (p === "" || p === "/index") p = "/";
    return location.origin + p;
  }

  // Pide el correo con el enlace + el código de 8 dígitos.
  // shouldCreateUser:false a propósito: esta puerta es para ENTRAR, no para
  // crear cuentas por descuido desde el panel.
  async function sendCode(email, opts) {
    const o = opts || {};
    const { error } = await sb.auth.signInWithOtp({
      email: String(email || "").trim(),
      options: { shouldCreateUser: !!o.createUser, emailRedirectTo: o.redirectTo || here() }
    });
    if (error) throw new Error(msg(error));
    return true;
  }

  /* Canjea lo que el enlace del correo haya dejado en la URL y la limpia.
     Formas posibles:
       ?token_hash=…&type=…  ← el enlace mágico pasando por el reenviador del hub
       ?code=…               ← enlace PKCE del mismo origen
       #access_token=…       ← flujo implícito (supabase-js ya lo guardó)
       ?error=… / #error=…   ← enlace vencido o ya usado
     Devuelve { session:true } si quedó sesión, { error } si el enlace ya no sirve. */
  async function consumeUrlSession() {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const tokenHash = q.get("token_hash") || h.get("token_hash");
    const type = q.get("type") || h.get("type") || "magiclink";
    const code = q.get("code");
    const bad = q.get("error_description") || h.get("error_description") || q.get("error") || h.get("error");
    const clean = () => { try { history.replaceState({}, "", here()); } catch (_) {} };
    if (!tokenHash && !code && !bad && !location.hash.includes("access_token")) return {};
    // En las páginas cuyo cliente NO trae detectSessionInUrl:false, supabase-js
    // puede haber canjeado ya el ?code= por su cuenta. Si acabamos con error
    // pero hay sesión viva, es eso — no un fallo. Nunca decir "no se pudo
    // entrar" a alguien que sí entró.
    const settled = async res => {
      if (!res.error) return res;
      const { data: { session } } = await sb.auth.getSession();
      return session ? { session: true } : res;
    };
    try {
      if (bad) { clean(); return settled({ error: msg({ message: decodeURIComponent(String(bad).replace(/\+/g, " ")) }) }); }
      if (tokenHash) {
        const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
        clean();
        if (error) return settled({ error: msg(error) });
        return { session: true, recovery: type === "recovery" };
      }
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        clean();
        if (error) return settled({ error: msg(error) });
        return { session: true };
      }
      clean(); // implícito: supabase-js ya guardó la sesión del hash
      return { session: true };
    } catch (e) { clean(); return settled({ error: msg(e) }); }
  }

  // Canjea el código. type:'email' es el tipo del enlace mágico / alta por correo.
  async function verifyCode(email, code) {
    const token = String(code || "").replace(/\D/g, "");
    if (token.length < 6) throw new Error("Escribe el código completo que te llegó por correo.");
    const { data, error } = await sb.auth.verifyOtp({
      email: String(email || "").trim(), token, type: "email"
    });
    if (error) throw new Error(msg(error));
    return data;
  }

  function checkPw(pw, pw2) {
    if (!pw || pw.length < MIN_PW) throw new Error("La contraseña debe tener al menos " + MIN_PW + " caracteres.");
    if (pw2 !== undefined && pw !== pw2) throw new Error("Las dos contraseñas no coinciden.");
    return true;
  }

  // Fija la contraseña de la sesión viva. Sólo puede llamarla quien YA probó
  // que controla el correo (entró con código) o quien ya tenía sesión.
  async function setPassword(pw, pw2) {
    checkPw(pw, pw2);
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw new Error(msg(error));
    return true;
  }

  // Cambio desde el panel, con la contraseña actual. Se re-verifica ANTES de
  // cambiar: si alguien encuentra una sesión abierta y sin vigilancia, no puede
  // adueñarse de la cuenta cambiándole la contraseña.
  async function changePassword(current, next, next2) {
    checkPw(next, next2);
    const { data: { user } } = await sb.auth.getUser();
    if (!user || !user.email) throw new Error("Tu sesión venció. Vuelve a entrar.");
    if (current === next) throw new Error("La contraseña nueva tiene que ser distinta de la actual.");
    const { error: re } = await sb.auth.signInWithPassword({ email: user.email, password: current });
    if (re) throw new Error("Tu contraseña actual no coincide.");
    return setPassword(next);
  }

  async function loginPassword(email, password) {
    const { error } = await sb.auth.signInWithPassword({
      email: String(email || "").trim(), password
    });
    if (error) { const e = new Error(msg(error)); e.badCredentials = /Invalid login credentials/i.test(error.message || ""); throw e; }
    return true;
  }

  /* ---------- estilos (una sola vez por página) ---------- */
  function css() {
    if (document.getElementById("va-css")) return;
    const s = document.createElement("style");
    s.id = "va-css";
    s.textContent = `
      .va-tabs{display:flex;gap:6px;margin-bottom:16px;background:rgba(0,0,0,.04);padding:4px;border-radius:100px}
      .va-tabs button{flex:1;border:0;background:transparent;font:inherit;font-size:13.5px;font-weight:600;
        padding:8px 10px;border-radius:100px;cursor:pointer;color:var(--tinta-60,#6b6560);transition:.18s}
      .va-tabs button.on{background:var(--lino,#F7F2E9);color:var(--tinta,#2C2722);box-shadow:0 1px 3px rgba(0,0,0,.08)}
      .va-f{margin-bottom:12px;text-align:left}
      .va-f label{display:block;font-size:12.5px;font-weight:600;margin-bottom:5px;color:var(--tinta-60,#6b6560)}
      .va-f input{width:100%;box-sizing:border-box}
      .va-code{letter-spacing:.34em;font-size:22px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
      .va-alt{margin-top:14px;text-align:center;font-size:13px;line-height:1.7}
      .va-alt button{border:0;background:none;padding:0;font:inherit;font-size:13px;color:var(--oro,#B68A3E);
        font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
      .va-note{font-size:12.5px;line-height:1.6;color:var(--tinta-60,#6b6560);margin:0 0 14px;text-align:left}
      .va-msg{margin-top:12px;font-size:13.5px;line-height:1.6;min-height:18px}
      .va-msg.bad{color:var(--bad,#B3261E)} .va-msg.ok{color:var(--salvia,#7E9078)}
      .va-hint{font-size:12px;color:var(--tinta-60,#6b6560);margin-top:5px}
    `;
    document.head.appendChild(s);
  }

  /* ---------- la puerta ---------- */
  /* mountGate(el, opts)
       el       : contenedor donde se dibuja (se vacía)
       onSuccess: se llama con la sesión ya creada
       msgEl    : dónde escribir los avisos (si no, usa uno propio)
       email    : correo con el que precargar
       note     : HTML opcional arriba del formulario
       footer   : HTML opcional debajo (p.ej. «¿aún no tienes perfil?»)
       start    : "pw" (por omisión) | "code"
  */
  function mountGate(el, opts) {
    css();
    const o = opts || {};
    const box = typeof el === "string" ? document.getElementById(el) : el;
    if (!box) return;
    const msgBox = o.msgEl ? (typeof o.msgEl === "string" ? document.getElementById(o.msgEl) : o.msgEl) : null;

    const st = { mode: o.start === "code" ? "code" : "pw", email: o.email || "", forcePw: false, sentAt: 0 };

    function say(text, kind) {
      const t = msgBox || box.querySelector(".va-msg");
      if (!t) return;
      t.className = (msgBox ? t.className.replace(/\b(bad|ok)\b/g, "").trim() + " " : "va-msg ") + (kind || "");
      t.innerHTML = text || "";
    }
    const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    function tabs() {
      return `<div class="va-tabs">
        <button type="button" data-go="pw" class="${st.mode === "pw" ? "on" : ""}">Con contraseña</button>
        <button type="button" data-go="code" class="${st.mode !== "pw" ? "on" : ""}">Con código por correo</button>
      </div>`;
    }

    function render() {
      let html = (o.note ? `<p class="va-note">${o.note}</p>` : "");

      if (st.mode === "pw") {
        html += tabs() + `<form data-act="pw">
          <div class="va-f"><label>Correo</label><input name="email" type="email" required autocomplete="username" value="${esc(st.email)}"></div>
          <div class="va-f"><label>Contraseña</label><input name="pass" type="password" required autocomplete="current-password"></div>
          <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">Entrar</button>
        </form>
        <div class="va-alt"><button type="button" data-go="forgot">¿Olvidaste tu contraseña? Entra con un código</button></div>`;

      } else if (st.mode === "code") {
        html += tabs() + `<form data-act="send">
          <p class="va-note">Te mandamos un <b>código de 8 dígitos</b> a tu correo. Sirve en cualquier aparato y no necesitas recordar ninguna contraseña.</p>
          <div class="va-f"><label>Correo</label><input name="email" type="email" required autocomplete="username" value="${esc(st.email)}"></div>
          <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">Enviarme el código</button>
        </form>`;
        if (!o.hidePwTab) html += `<div class="va-alt"><button type="button" data-go="pw">Prefiero usar mi contraseña</button></div>`;

      } else if (st.mode === "sent") {
        html += `<form data-act="verify">
          <p class="va-note">Enviamos el código a <b>${esc(st.email)}</b>. Llega en menos de un minuto — si no aparece, revisa <b>spam</b> o <b>promociones</b>.</p>
          <div class="va-f"><label>Código de 8 dígitos</label>
            <input name="code" class="va-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required placeholder="········"></div>
          <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">Entrar</button>
        </form>
        <div class="va-alt">
          <button type="button" data-go="resend">Reenviar código</button> ·
          <button type="button" data-go="code">Usar otro correo</button>
        </div>`;

      } else if (st.mode === "newpw") {
        html += `<form data-act="newpw">
          <p class="va-note">Ya estás dentro. Elige tu nueva contraseña — es la misma para toda tu identidad FlowBond.</p>
          <div class="va-f"><label>Nueva contraseña</label><input name="p1" type="password" minlength="${MIN_PW}" required autocomplete="new-password">
            <div class="va-hint">Mínimo ${MIN_PW} caracteres. No puede ser una contraseña filtrada públicamente.</div></div>
          <div class="va-f"><label>Repítela</label><input name="p2" type="password" minlength="${MIN_PW}" required autocomplete="new-password"></div>
          <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">Guardar y continuar</button>
        </form>
        <div class="va-alt"><button type="button" data-go="skip">Ahora no, entrar sin cambiarla</button></div>`;
      }

      if (o.footer) html += `<div class="va-alt">${o.footer}</div>`;
      if (!msgBox) html += `<div class="va-msg"></div>`;
      box.innerHTML = html;
      wire();
      const first = box.querySelector("input:not([type=hidden])");
      if (first && st.mode !== "pw") { try { first.focus(); } catch (_) {} }
    }

    function busy(form, on, label) {
      const b = form && form.querySelector("button[type=submit]");
      if (!b) return;
      if (on) { b.dataset.txt = b.textContent; b.disabled = true; b.textContent = label || "Un momento…"; }
      else { b.disabled = false; if (b.dataset.txt) b.textContent = b.dataset.txt; }
    }

    async function done() {
      say("");
      if (typeof o.onSuccess === "function") await o.onSuccess();
    }

    function wire() {
      box.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", async () => {
        const go = b.dataset.go;
        const cur = box.querySelector("input[name=email]");
        if (cur && cur.value) st.email = cur.value.trim();
        if (go === "pw") { st.mode = "pw"; st.forcePw = false; say(""); return render(); }
        if (go === "code") { st.mode = "code"; say(""); return render(); }
        if (go === "forgot") { st.mode = "code"; st.forcePw = true; say(""); render(); return say("Te mandamos un código para entrar; ahí mismo eliges tu contraseña nueva.", "ok"); }
        if (go === "skip") { return done(); }
        if (go === "resend") {
          const wait = REENVIO_S - Math.round((Date.now() - st.sentAt) / 1000);
          if (wait > 0) return say("Espera " + wait + " segundos antes de pedir otro código.", "bad");
          try { await sendCode(st.email); st.sentAt = Date.now(); say("Código reenviado. Revisa tu correo.", "ok"); }
          catch (err) { say(err.message, "bad"); }
        }
      }));

      const form = box.querySelector("form");
      if (!form) return;
      form.addEventListener("submit", async ev => {
        ev.preventDefault();
        const f = ev.target, act = f.dataset.act, v = n => (f.elements[n] ? f.elements[n].value : "");
        say("");
        try {
          if (act === "pw") {
            st.email = v("email").trim();
            busy(f, true, "Entrando…");
            try { await loginPassword(st.email, v("pass")); }
            catch (err) {
              busy(f, false);
              if (err.badCredentials) {
                say(err.message + " ", "bad");
                const t = (msgBox || box.querySelector(".va-msg"));
                const link = document.createElement("button");
                link.type = "button"; link.textContent = "Mándame un código →";
                link.style.cssText = "border:0;background:none;font:inherit;font-weight:600;color:var(--oro,#B68A3E);text-decoration:underline;cursor:pointer";
                link.addEventListener("click", () => { st.mode = "code"; st.forcePw = true; say(""); render(); });
                if (t) t.appendChild(link);
                return;
              }
              return say(err.message, "bad");
            }
            return done();
          }

          if (act === "send") {
            st.email = v("email").trim();
            busy(f, true, "Enviando…");
            await sendCode(st.email);
            st.sentAt = Date.now(); st.mode = "sent"; render();
            return say("Listo. Revisa tu correo (y la carpeta de spam).", "ok");
          }

          if (act === "verify") {
            busy(f, true, "Comprobando…");
            await verifyCode(st.email, v("code"));
            if (st.forcePw) { st.mode = "newpw"; render(); return say("Código correcto.", "ok"); }
            return done();
          }

          if (act === "newpw") {
            busy(f, true, "Guardando…");
            await setPassword(v("p1"), v("p2"));
            return done();
          }
        } catch (err) {
          busy(f, false);
          say(err.message || "Algo salió mal.", "bad");
        }
      });
    }

    render();
    return { render, state: st };
  }

  /* Formulario de cambio de contraseña para adentro del panel (sesión viva). */
  function mountChangePassword(el, opts) {
    css();
    const o = opts || {};
    const box = typeof el === "string" ? document.getElementById(el) : el;
    if (!box) return;
    box.innerHTML = `<form data-act="chg">
      <div class="va-f"><label>Contraseña actual</label><input name="cur" type="password" required autocomplete="current-password"></div>
      <div class="va-f"><label>Nueva contraseña</label><input name="p1" type="password" minlength="${MIN_PW}" required autocomplete="new-password">
        <div class="va-hint">Mínimo ${MIN_PW} caracteres. El servidor rechaza contraseñas que aparecen en filtraciones conocidas.</div></div>
      <div class="va-f"><label>Repite la nueva</label><input name="p2" type="password" minlength="${MIN_PW}" required autocomplete="new-password"></div>
      <button class="btn btn-primary" type="submit">Cambiar mi contraseña</button>
      <div class="va-msg"></div>
    </form>`;
    const f = box.querySelector("form"), m = box.querySelector(".va-msg");
    const say = (t, k) => { m.className = "va-msg " + (k || ""); m.textContent = t; };
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      const b = f.querySelector("button[type=submit]");
      say(""); b.disabled = true; const txt = b.textContent; b.textContent = "Guardando…";
      try {
        await changePassword(f.elements.cur.value, f.elements.p1.value, f.elements.p2.value);
        f.reset();
        say("Listo, tu contraseña quedó cambiada.", "ok");
        if (typeof o.onDone === "function") o.onDone();
      } catch (err) { say(err.message, "bad"); }
      b.disabled = false; b.textContent = txt;
    });
  }

  return { MIN_PW, msg, here, sendCode, verifyCode, consumeUrlSession, setPassword, changePassword, loginPassword, checkPw, mountGate, mountChangePassword };
})();
