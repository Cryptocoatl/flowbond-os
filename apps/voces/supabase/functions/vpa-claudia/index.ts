// VPA ClaudIA — asistente agéntico del panel de Mónica.
//
// SEGURIDAD (decisión de diseño): todo se ejecuta con el **JWT de quien pregunta**,
// nunca con service_role. Así el agente no puede hacer NADA que ella no pueda hacer
// a mano: los mismos vpa_require(auth.uid(),'super_admin') que ya protegen el panel
// aplican solos. Si mañana entra alguien con otro rol, el agente queda limitado a ese rol.
//
// ESCRITURAS CON CONFIRMACIÓN (decisión de Steph 2026-07-28): las herramientas que
// cambian algo NO se ejecutan solas. El agente las propone, la fn corta el bucle y
// devuelve `pending_action`; el panel le pregunta a Mónica y reenvía con `confirm`.
// Publicar un perfil lo hace público y marcar pagado entrega producto — no van solas.
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Eres ClaudIA, la asistente de Mónica Salgado en el panel de administración de
"Voces para el Alma" (voces.world). Mónica NO es técnica: háblale claro, en español, sin jerga.

CÓMO TRABAJAS
- NUNCA inventes datos. Si te preguntan por una persona, un pago o un estado, USA UNA HERRAMIENTA
  para consultarlo. Es preferible decir "déjame revisar" y consultar, que suponer.
- Responde corto y directo. Primero la respuesta, después el detalle si hace falta.
- Si algo no cuadra, dilo con honestidad en vez de tranquilizarla de más.

CÓMO FUNCIONA EL NEGOCIO (contexto que ya sabes)
- Las personas se registran en /crear-perfil, eligen plan en /unete y pagan con Stripe.
- El pago NO publica el perfil. Al pagar, el perfil queda en estado "pending" = pagado y EN REVISIÓN.
  Mónica lo revisa y lo publica. Sólo entonces sale al directorio público.
- Estados de un perfil: "hidden" = no ha pagado · "pending" = pagó, espera revisión · "published" = en vivo.
- Si alguien dice que pagó pero NO aparece en pendientes de aprobación, es que su pago no se completó.
  Eso pasa cuando llegan a la pantalla de Stripe y la cierran sin terminar.
- Las membresías cobran por Stripe; los productos y ebooks por MercadoPago.

CAMBIOS QUE HACES
- Las herramientas que cambian algo (publicar u ocultar un perfil, marcar un pedido pagado)
  requieren que Mónica confirme. Tú las propones; el panel le pregunta.
- Antes de proponer un cambio, verifica con una herramienta de lectura que sea lo correcto.
  Ejemplo: antes de publicar a alguien, confirma que de verdad pagó.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "estado_de_cobros",
    description: "Estado de los rieles de cobro (Stripe para membresías, MercadoPago para productos, transferencia) y cuántas membresías hay activas vs pendientes. Úsala cuando pregunte si los pagos funcionan o qué falta configurar.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "pendientes_de_aprobacion",
    description: "Lista de personas que YA PAGARON y esperan que Mónica revise y publique su perfil. Úsala para '¿quién falta por aprobar?' o para verificar si alguien pagó.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "buscar_persona",
    description: "Busca una voz/especialista por nombre o correo y devuelve su estado de perfil y de suscripción. Úsala SIEMPRE que pregunte por alguien en particular.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string", description: "Nombre o correo, aunque sea parcial" } },
      required: ["texto"], additionalProperties: false,
    },
  },
  {
    name: "pedidos_recientes",
    description: "Últimos pedidos de la tienda (ebooks, productos, talleres) con su estado de pago. Úsala para dudas sobre compras, no sobre membresías.",
    input_schema: {
      type: "object",
      properties: { limite: { type: "integer", description: "Cuántos traer, máximo 20" } },
      additionalProperties: false,
    },
  },
  {
    name: "publicar_perfil",
    description: "PUBLICA el perfil de una voz en el directorio público. Requiere confirmación de Mónica. Verifica antes que la persona haya pagado.",
    input_schema: {
      type: "object",
      properties: {
        specialist_id: { type: "string", description: "El id del especialista" },
        nombre: { type: "string", description: "Su nombre, para mostrárselo a Mónica al confirmar" },
      },
      required: ["specialist_id", "nombre"], additionalProperties: false,
    },
  },
  {
    name: "ocultar_perfil",
    description: "Quita un perfil del directorio público (lo deja oculto). Requiere confirmación de Mónica.",
    input_schema: {
      type: "object",
      properties: {
        specialist_id: { type: "string" },
        nombre: { type: "string", description: "Su nombre, para la confirmación" },
      },
      required: ["specialist_id", "nombre"], additionalProperties: false,
    },
  },
  {
    name: "marcar_pedido_pagado",
    description: "Marca un pedido como PAGADO. Esto entrega el producto al comprador y le manda su correo. Requiere confirmación de Mónica. Úsala sólo cuando ella confirme que vio el dinero.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        detalle: { type: "string", description: "Comprador y monto, para la confirmación" },
      },
      required: ["order_id", "detalle"], additionalProperties: false,
    },
  },
];

const ESCRITURA = new Set(["publicar_perfil", "ocultar_perfil", "marcar_pedido_pagado"]);

function resumenAccion(name: string, input: Record<string, string>): string {
  if (name === "publicar_perfil") return `Publicar el perfil de ${input.nombre} en el directorio público.`;
  if (name === "ocultar_perfil") return `Quitar del directorio el perfil de ${input.nombre}.`;
  if (name === "marcar_pedido_pagado") return `Marcar como PAGADO el pedido de ${input.detalle}. Esto le entrega su compra.`;
  return `Ejecutar ${name}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authz = req.headers.get("Authorization") || "";
  if (!authz) return json({ error: "no_auth" }, 401);

  // Cliente con la sesión de QUIEN pregunta — sus permisos, no los del servidor.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authz } }, auth: { persistSession: false } },
  );

  const { data: rol } = await userClient.rpc("vpa_my_role");
  if (rol !== "super_admin") return json({ error: "forbidden", note: "Sólo la administradora puede usar esta ayuda." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const messages = (Array.isArray(body.messages) ? body.messages : []) as Anthropic.MessageParam[];
  if (!messages.length) return json({ error: "sin_mensajes" }, 400);
  // El panel reenvía `confirm` con la acción que Mónica aceptó.
  const confirm = (body.confirm || null) as { tool: string; input: Record<string, string> } | null;

  // La llave vive en el vault, nunca en el repo ni en el navegador.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });
  const { data: cfg } = await admin.rpc("vpa__ai_config");
  const apiKey = cfg?.vpa_anthropic_api_key;
  if (!apiKey) return json({ error: "not_configured", note: "Falta la llave de Anthropic en el vault." }, 409);

  const anthropic = new Anthropic({ apiKey });

  async function correr(name: string, input: Record<string, string>): Promise<string> {
    try {
      if (name === "estado_de_cobros") {
        const { data, error } = await userClient.rpc("vpa_payments_overview");
        return error ? `error: ${error.message}` : JSON.stringify(data);
      }
      if (name === "pendientes_de_aprobacion") {
        const { data, error } = await userClient.rpc("vpa_pending_approvals");
        if (error) return `error: ${error.message}`;
        const list = data || [];
        return list.length ? JSON.stringify(list) : "No hay nadie esperando aprobación ahora mismo.";
      }
      if (name === "buscar_persona") {
        const q = `%${String(input.texto || "").slice(0, 60)}%`;
        const { data: specs, error } = await userClient
          .from("app_vpa_specialists").select("id,name,status,contact_email").ilike("name", q).limit(8);
        if (error) return `error: ${error.message}`;
        const { data: subs } = await userClient
          .from("app_vpa_subscriptions")
          .select("id,specialist_id,status,plan_id,period,price_cents,provider,started_at,current_period_end,buyer_email,code")
          .or(`buyer_email.ilike.${q}`).limit(8);
        const ids = (specs || []).map((s: Record<string, string>) => s.id);
        const { data: subs2 } = ids.length
          ? await userClient.from("app_vpa_subscriptions")
              .select("id,specialist_id,status,plan_id,period,price_cents,provider,started_at,current_period_end,buyer_email,code")
              .in("specialist_id", ids).limit(16)
          : { data: [] };
        return JSON.stringify({ perfiles: specs || [], suscripciones: [...(subs || []), ...(subs2 || [])] });
      }
      if (name === "pedidos_recientes") {
        const lim = Math.min(Math.max(Number(input.limite) || 10, 1), 20);
        const { data, error } = await userClient.from("app_vpa_order_groups")
          .select("id,status,total_cents,buyer_email,pay_method,created_at")
          .order("created_at", { ascending: false }).limit(lim);
        return error ? `error: ${error.message}` : JSON.stringify(data);
      }
      if (name === "publicar_perfil" || name === "ocultar_perfil") {
        const estado = name === "publicar_perfil" ? "published" : "hidden";
        const { error } = await userClient.rpc("vpa_set_specialist_status",
          { p_id: input.specialist_id, p_status: estado });
        return error ? `error: ${error.message}` : `Listo: el perfil de ${input.nombre} quedó ${estado === "published" ? "PUBLICADO en el directorio" : "OCULTO"}.`;
      }
      if (name === "marcar_pedido_pagado") {
        const { error } = await userClient.rpc("vpa_set_order_status",
          { p_id: input.order_id, p_status: "paid" });
        return error ? `error: ${error.message}` : `Listo: el pedido quedó marcado como pagado y se le entregó al comprador.`;
      }
      return `herramienta desconocida: ${name}`;
    } catch (e) {
      return `error: ${(e as Error).message}`;
    }
  }

  const hist: Anthropic.MessageParam[] = [...messages];
  let ejecutado: string | null = null;

  for (let vuelta = 0; vuelta < 8; vuelta++) {
    const res = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      output_config: { effort: "medium" },
      system: SYSTEM,
      tools: TOOLS,
      messages: hist,
    });

    if (res.stop_reason === "refusal") {
      return json({ ok: true, reply: "No puedo ayudarte con eso. ¿Probamos de otra forma?" });
    }

    const usos = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!usos.length) {
      const texto = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text).join("\n").trim();
      return json({ ok: true, reply: texto || "…", executed: ejecutado });
    }

    hist.push({ role: "assistant", content: res.content });
    const resultados: Anthropic.ToolResultBlockParam[] = [];

    for (const uso of usos) {
      const input = (uso.input || {}) as Record<string, string>;
      const yaConfirmada = confirm && confirm.tool === uso.name &&
        JSON.stringify(confirm.input || {}) === JSON.stringify(input);

      if (ESCRITURA.has(uso.name) && !yaConfirmada) {
        // Corta el bucle: el panel le pregunta a Mónica antes de tocar nada.
        return json({
          ok: true,
          pending_action: { tool: uso.name, input, resumen: resumenAccion(uso.name, input) },
          reply: `Necesito que confirmes esto antes de hacerlo:\n\n**${resumenAccion(uso.name, input)}**`,
          messages: hist.slice(messages.length ? 0 : 0),
        });
      }
      const out = await correr(uso.name, input);
      if (ESCRITURA.has(uso.name)) ejecutado = out;
      resultados.push({ type: "tool_result", tool_use_id: uso.id, content: out });
    }
    hist.push({ role: "user", content: resultados });
  }

  return json({ ok: true, reply: "Me enredé consultando. ¿Me lo preguntas de otra forma?" });
});
