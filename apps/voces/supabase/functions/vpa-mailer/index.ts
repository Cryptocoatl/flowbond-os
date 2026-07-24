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
