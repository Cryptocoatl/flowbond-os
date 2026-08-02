// VPA mailer — drena app_vpa_email_outbox vía Resend.
// Config (Vault): vpa_resend_api_key, vpa_mail_from — leídas con vpa__mailer_config().
// Se invoca fire-and-forget desde las páginas (anon JWT pasa verify_jwt) o desde /admin.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://voces.flowme.one";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function tpl(template: string, p: Record<string, unknown>) {
  const en = p.locale === "en";
  const name = (p.name as string) || "";
  const slug = p.slug ? `${SITE}/?voz=${p.slug}` : SITE;
  const wrap = (title: string, body: string) => ({
    subject: title,
    html: `<div style="font-family:Georgia,serif;color:#2C2722;background:#F7F2E9;padding:32px">
      <div style="max-width:560px;margin:0 auto;background:#FCFAF4;border-radius:16px;padding:32px;border:1px solid rgba(44,39,34,.12)">
      <div style="text-align:center;margin-bottom:18px">
        <div style="width:14px;height:14px;border-radius:50%;background:#B68A3E;margin:0 auto;box-shadow:0 0 0 6px rgba(203,161,90,.25),0 0 0 12px rgba(126,144,120,.15)"></div>
      </div>
      <h2 style="font-weight:400;text-align:center">${title}</h2>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">${body}</div>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8a8378;margin-top:26px;text-align:center">Voces para el Alma · Voices for the Soul<br><a href="${SITE}" style="color:#B68A3E">voces.flowme.one</a></p>
      </div></div>`,
  });
  switch (template) {
    case "application_received":
      return en
        ? wrap("Your voice is on its way", `<p>Hi ${name},</p><p>We received your profile at <b>Voces para el Alma</b>. Our team will review it carefully and write to you at this address once it is approved and published in the directory.</p><p>Thank you for trusting us with your voice.</p>`)
        : wrap("Tu voz está en camino", `<p>Hola ${name}:</p><p>Recibimos tu perfil en <b>Voces para el Alma</b>. Nuestro equipo lo revisará con cuidado y te escribiremos a este correo cuando esté aprobado y publicado en el directorio.</p><p>Gracias por confiarnos tu voz.</p>`);
    case "profile_published":
      return en
        ? wrap("Your profile is live ✨", `<p>Hi ${name},</p><p>Your profile is now published in <b>Voces para el Alma</b>.</p><p>Share your direct link with your community:<br><a href="${slug}" style="color:#B68A3E">${slug}</a></p>`)
        : wrap("Tu perfil ya está publicado ✨", `<p>Hola ${name}:</p><p>Tu perfil ya está publicado en <b>Voces para el Alma</b>.</p><p>Comparte tu enlace directo con tu comunidad:<br><a href="${slug}" style="color:#B68A3E">${slug}</a></p>`);
    case "welcome":
      return wrap("Bienvenida a tu espacio en Voces", `<p>Hola ${name}:</p><p>Tu perfil quedó ligado a tu cuenta. Desde <a href="${SITE}/mi-voz" style="color:#B68A3E">${SITE}/mi-voz</a> puedes ver mensajes de Voces, proponer cambios, administrar tu oferta y tus datos de depósito.</p><p>Tu enlace para compartir: <a href="${slug}" style="color:#B68A3E">${slug}</a></p>`);
    case "admin_note":
      return wrap("Tienes un mensaje de Voces", `<p>Hola ${name}:</p><p>El equipo de Voces dejó un mensaje sobre tu perfil:</p><blockquote style="border-left:3px solid #CBA15A;margin:12px 0;padding:4px 14px;color:#5a5348">${(p.message as string) || ""}</blockquote><p>Escríbenos respondiendo este correo, o entra a <a href="${SITE}/mi-voz" style="color:#B68A3E">tu panel</a> si ya reclamaste tu perfil.</p>`);
    case "order_received": {
      const total = (((p.total_cents as number) || 0) / 100).toLocaleString("es-MX");
      return wrap("Recibimos tu pedido", `<p>Hola${name ? " " + name : ""}:</p><p>Recibimos tu pedido <b>${String(p.order_id).slice(0, 8)}</b> por <b>$${total} MXN</b> (${p.items} artículo(s)).</p><p>En breve te contactaremos con las instrucciones de pago para completarlo.</p>`);
    }
    case "order_paid": {
      const total = (((p.total_cents as number) || 0) / 100).toLocaleString("es-MX");
      return wrap("Pago confirmado — gracias", `<p>Hola${name ? " " + name : ""}:</p><p>Confirmamos el pago de tu pedido <b>${String(p.order_id).slice(0, 8)}</b> por <b>$${total} MXN</b>. Pronto recibirás la entrega de cada artículo.</p>`);
    }
    case "ebook_ready": {
      const lib = `${SITE}/biblioteca?email=${encodeURIComponent(String(p.email || ""))}`;
      return wrap("Tu compra está lista 🌿", `<p>Hola${name ? " " + name : ""}:</p>
        <p>¡Gracias por tu compra en <b>Voces para el Alma</b>! Tu contenido digital ya está disponible.</p>
        <p>Accede a tus descargas de forma segura con tu correo:</p>
        <p style="text-align:center;margin:22px 0"><a href="${lib}" style="display:inline-block;background:#B01E2E;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:Helvetica,Arial,sans-serif">Ir a mi biblioteca</a></p>
        <p style="font-size:13px;color:#8a8378">Te enviaremos un código a este correo para entrar. Cada archivo lleva tu correo impreso como licencia personal — es tuyo, no lo compartas.</p>`);
    }
    case "test_ready": {
      // Test de Temperamentos (La Vida es Bella): acceso web de un solo uso, no PDF.
      const url = String(p.url || "");
      return wrap("Tu Test de Temperamentos está listo 🌅", `<p>Hola${name ? " " + esc(name) : ""}:</p>
        <p>Gracias por tu compra. Tu <b>Test de Temperamentos</b> ya está listo — al terminar recibes tu resultado y la <b>guía completa</b> de tu temperamento.</p>
        <p style="text-align:center;margin:22px 0"><a href="${esc(url)}" style="display:inline-block;background:#B01E2E;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:Helvetica,Arial,sans-serif">Empezar mi Test</a></p>
        <p style="font-size:13px;color:#8a8378"><b>Guarda este correo:</b> este enlace es tu acceso y es <b>personal y de un solo uso</b>. Búscate un momento de calma y responde con lo primero que sientas — así el resultado es verdadero.</p>
        <p style="font-size:13px;color:#8a8378">Si el botón no abre, copia esta dirección:<br><span style="color:#B68A3E;word-break:break-all">${esc(url)}</span></p>`);
    }
    case "test_result": {
      // Resultado del Test de Temperamentos (La Vida es Bella).
      // Por spec: SOLO el temperamento resultante y su descripción. Sin eBook ni adjuntos.
      // Claves, nombres, colores y esencias tomados tal cual del Test (lavidaesbella.site/test).
      const T: Record<string, { name: string; line: string; color: string }> = {
        DOM: { name: "Colérico · Dominante", color: "#ff5d47",
               line: "Naciste con motor propio. Donde otros ven un problema, tú ves algo que hay que resolver — y lo resuelves ya. Eres la que arranca, la que decide, la que no se queda esperando permiso." },
        INF: { name: "Sanguíneo · Influyente", color: "#ffb43d",
               line: "Entras a un lugar y el lugar cambia. Tienes el don de encender a la gente: donde hay tensión pones humor, donde hay desánimo pones chispa. Vives el presente con una intensidad que a otros les toma años aprender." },
        EST: { name: "Flemático · Estable", color: "#37c294",
               line: "Eres el suelo firme donde los demás se paran. Cuando todo se tensa, tú bajas la temperatura del cuarto con solo estar ahí. La gente te busca porque contigo se sienten en paz — y porque escuchas de verdad." },
        MIN: { name: "Melancólico · Minucioso", color: "#7d9bff",
               line: "Ves lo que nadie más ve. Mientras los demás opinan, tú observas, ordenas y entiendes. Tu profundidad no es exageración: es la razón por la que las cosas que tocas quedan bien hechas." },
      };
      const key = String(p.primary || "").toUpperCase();
      const t = T[key] || { name: String(p.primary || "tu temperamento"), color: "#B68A3E", line: "" };
      const sec = T[String(p.secondary || "").toUpperCase()];
      const isTeam = p.team_copy === true;
      const who = esc(String(p.name || "")) || "";

      const scores = (p.scores && typeof p.scores === "object") ? p.scores as Record<string, number> : null;
      const bars = scores
        ? Object.keys(T).filter((k) => k in scores).map((k) => {
            const v = Number(scores[k]) || 0;
            const total = Object.values(scores).reduce((n, x) => n + (Number(x) || 0), 0) || 1;
            const pct = Math.round((v / total) * 100);
            return `<tr><td style="padding:5px 10px 5px 0;font-size:13px;color:#5a5348;white-space:nowrap">${T[k].name}</td>
              <td style="padding:5px 0;width:100%"><div style="background:#EFE3D2;border-radius:99px;height:8px">
              <div style="background:${T[k].color};width:${pct}%;height:8px;border-radius:99px"></div></div></td>
              <td style="padding:5px 0 5px 10px;font-size:12px;color:#8a8378">${v}</td></tr>`;
          }).join("")
        : "";

      const body = `
        ${isTeam
          ? `<p style="font-size:13px;color:#8a8378;background:#F7F2E9;padding:10px 14px;border-radius:8px">
               <b>Copia para el equipo.</b> ${who ? who + " " : ""}(${esc(p.email)}) acaba de recibir su resultado.
               Aún no ha agendado sesión — buen momento para acompañar. Responde este correo para escribirle directo.</p>`
          : `<p>Hola${who ? " " + who : ""}:</p><p>Este es tu resultado del <b>Test de Temperamentos</b>, tal como lo viste en pantalla.</p>`}
        <div style="text-align:center;margin:26px 0 18px">
          <p style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8a8378;margin:0 0 6px">Tu temperamento principal</p>
          <p style="font-family:Georgia,serif;font-size:34px;color:${t.color};margin:0">${esc(t.name)}</p>
        </div>
        <p style="text-align:center;color:#5a5348">${esc(t.line)}</p>
        ${sec ? `<p style="text-align:center;font-size:14px;color:#8a8378">Tu segundo estilo: <b>${esc(sec.name)}</b>${p.tie === true ? " — quedaron empatados, las dos guías son tuyas." : "."}</p>` : ""}
        ${bars ? `<table style="width:100%;border-collapse:collapse;margin:22px 0 4px">${bars}</table>` : ""}
        ${isTeam ? "" : `<p style="font-size:13px;color:#8a8378;margin-top:24px">Ningún temperamento es mejor que otro: son distintas expresiones de lo humano. El temperamento es el punto de partida — el carácter es el camino que eliges recorrer.</p>`}`;

      return wrap(isTeam ? `Resultado del Test · ${t.name}${who ? " · " + who : ""}` : `Tu temperamento: ${t.name} 🌅`, body);
    }
    case "payout_sent": {
      const KIND: Record<string, string> = {
        mercadopago: "MercadoPago", paypal: "PayPal", wise: "Wise", dolarapp: "DolarApp / ARQ",
        usdc: "USDC", clabe: "transferencia SPEI", bank_intl: "transferencia internacional",
        credit: "crédito en Voces",
      };
      const total = (((p.amount_cents as number) || 0) / 100).toLocaleString("es-MX", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      const via = KIND[String(p.kind || "")] || String(p.kind || "");
      return wrap("Te enviamos tu pago 🌿", `<p>Hola${name ? " " + esc(name) : ""}:</p>
        <p>Te enviamos <b>$${total} MXN</b> por <b>${esc(via)}</b> — tu parte de las ventas en <b>Voces para el Alma</b>.</p>
        ${p.ref ? `<p style="font-size:13px;color:#8a8378">Referencia: <b>${esc(String(p.ref))}</b></p>` : ""}
        <p style="text-align:center;margin:22px 0"><a href="${SITE}/mi-voz" style="display:inline-block;background:#B01E2E;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:Helvetica,Arial,sans-serif">Ver mis cobros</a></p>
        <p style="font-size:13px;color:#8a8378">Según el método, puede tardar unos minutos u horas en reflejarse. Si algo no cuadra, respóndenos este correo.</p>`);
    }
    case "booking_paid": {
      // Segunda notificación de una sesión agendada (la primera la manda Calendly).
      // Aquí NO va el día ni la hora: eso lo sabe Calendly. Esto confirma que el
      // dinero entró por Voces, para conciliar reserva ↔ pago real.
      const total = (((p.amount_cents as number) || 0) / 100).toLocaleString("es-MX", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      const buyer = String(p.buyer_name || "").trim();
      return wrap("Pago recibido por una sesión 🗓", `<p>Hola${name ? " " + esc(name) : ""}:</p>
        <p>Se pagó una de tus sesiones a través de <b>Voces para el Alma</b>.</p>
        <p><b>Sesión:</b> ${esc(p.titles || "")}<br>
           <b>Comprador:</b> ${esc(buyer || "(sin nombre)")}${p.buyer_email ? ` &lt;<a href="mailto:${esc(p.buyer_email)}" style="color:#B68A3E">${esc(p.buyer_email)}</a>&gt;` : ""}<br>
           <b>Monto pagado:</b> $${total} MXN<br>
           <b>Pedido:</b> ${esc(String(p.order_id || "").slice(0, 8))}</p>
        <p style="font-size:13px;color:#8a8378">La <b>fecha y hora</b> te llegan por separado en el correo de <b>Calendly</b>, con los datos que la persona capturó ahí. Este correo es tu comprobante de que la reserva corresponde a un pago real recibido por Voces.</p>
        <p style="text-align:center;margin:22px 0"><a href="${SITE}/mi-voz" style="display:inline-block;background:#B01E2E;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:Helvetica,Arial,sans-serif">Ver en mi panel</a></p>`);
    }
    case "contacto":
      return wrap(`Nuevo mensaje de contacto${name ? " · " + esc(name) : ""}`, `
        <p>Recibiste un mensaje desde <b>Voces para el Alma</b>:</p>
        <p><b>Nombre:</b> ${esc(name)}<br>
           <b>Correo:</b> <a href="mailto:${esc(p.email)}" style="color:#B68A3E">${esc(p.email)}</a>
           ${p.discipline ? `<br><b>Disciplina / tema:</b> ${esc(p.discipline)}` : ""}</p>
        <blockquote style="border-left:3px solid #CBA15A;margin:14px 0;padding:8px 14px;color:#5a5348;white-space:pre-wrap">${esc(p.message)}</blockquote>
        <p style="font-size:13px;color:#8a8378">Responde este correo para contestarle directamente a ${esc(name) || "quien escribió"}.</p>`);
    default:
      return wrap("Voces para el Alma", `<p>${esc(JSON.stringify(p))}</p>`);
  }
}

Deno.serve(async (_req) => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: cfg } = await sb.rpc("vpa__mailer_config");
  const apiKey = cfg?.vpa_resend_api_key;
  const from = cfg?.vpa_mail_from || "Voces para el Alma <onboarding@resend.dev>";
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, configured: false, note: "vault secrets vpa_resend_api_key / vpa_mail_from not set — outbox left queued" }), { headers: { "Content-Type": "application/json" } });
  }
  const { data: rows, error } = await sb.rpc("vpa__outbox_take", { p_limit: 20 });
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  let sent = 0, failed = 0;
  for (const row of rows ?? []) {
    try {
      const { subject, html } = tpl(row.template, row.payload ?? {});
      const replyTo = (row.payload ?? {}).reply_to;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [row.to_email], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
      sent++;
    } catch (e) {
      failed++;
      await sb.rpc("vpa__outbox_fail", { p_id: row.id, p_error: String(e) });
    }
  }
  return new Response(JSON.stringify({ ok: true, sent, failed }), { headers: { "Content-Type": "application/json" } });
});
