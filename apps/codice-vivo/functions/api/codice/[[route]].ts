/**
 * Códice Vivo — Admin API (Cloudflare Pages Functions, same-origin /api/codice/*)
 *
 *   Public:   GET  /api/codice/site         -> published overrides/sections/media
 *             GET  /api/codice/asset/<key>  -> stream an R2 atmosphere asset
 *   Auth:     POST /api/codice/login        -> handle + access code -> signed session token
 *   Admin (session bearer required, handle checked against codice_admins):
 *             GET  /api/codice/state        -> everything the admin panel renders
 *             POST /api/codice/save         -> save a copy override (+log)
 *             POST /api/codice/section      -> add/update a structured section (+log)
 *             POST /api/codice/media        -> upload image to R2 + register (+log)
 *             POST /api/codice/release      -> release a governance-locked value (super_admin)
 *             POST /api/codice/revert       -> revert an override to a prior value (+log)
 *             POST /api/codice/chat         -> agentic ClaudIA turn (tools apply edits, all logged)
 *
 * All writes go through SECURITY DEFINER RPCs that append to codice_activity_log.
 * Secrets live in the Pages project (wrangler pages secret put): SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE, ANTHROPIC_API_KEY. Binding: CODICE_ASSETS (R2).
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  ANTHROPIC_API_KEY: string;
  AUTH_SECRET: string;        // HMAC session signing + access-code pepper
  CODICE_ASSETS: R2Bucket;
}

const J = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// ---- Supabase REST helpers (service role) ---------------------------------
async function rpc(env: Env, fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function rest(env: Env, path: string) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!r.ok) throw new Error(`rest ${path} ${r.status}: ${await r.text()}`);
  return r.json();
}

// ---- self-contained handle + access-code auth -----------------------------
const enc = new TextEncoder();
function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function sha256hex(msg: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(msg));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// session token = "<payloadb64>.<sig>", payload = {h:handle, r:role, exp}
async function issue(env: Env, handle: string, role: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ h: handle, r: role, exp: Date.now() + 1000 * 60 * 60 * 12 })));
  return `${payload}.${await hmac(env.AUTH_SECRET, payload)}`;
}
function cookieVal(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return "";
}
async function verifySession(request: Request, env: Env): Promise<{ handle: string; role: string } | null> {
  const auth = request.headers.get("authorization") || "";
  const tok = (auth.startsWith("Bearer ") ? auth.slice(7) : "") || cookieVal(request, "cv_session");
  const [payload, sig] = tok.split(".");
  if (!payload || !sig) return null;
  if (!ctEq(sig, await hmac(env.AUTH_SECRET, payload))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
    if (!p.exp || Date.now() > p.exp) return null;
    return { handle: p.h, role: p.r };
  } catch { return null; }
}
async function login(env: Env, handle: string, code: string): Promise<{ handle: string; role: string } | null> {
  if (!handle || !code) return null;
  const rows: any[] = await rest(env, `codice_admins?handle=eq.${encodeURIComponent(handle)}&select=handle,code_hash,role,active`);
  const row = rows && rows[0];
  if (!row || !row.active) return null;
  if (!ctEq(await sha256hex(code + env.AUTH_SECRET), row.code_hash)) return null;
  await rpc(env, "codice_mark_login", { p_handle: handle });
  await rpc(env, "codice_log", { p_actor: handle, p_action: "login", p_target: handle, p_before: null, p_after: null });
  return { handle: row.handle, role: row.role };
}

// ---- agentic ClaudIA: tools that edit the page ----------------------------
const TOOLS = [
  {
    name: "save_override",
    description:
      "Set the text of an existing editable field on the public Códice Vivo page. " +
      "key is '<section>.<field>.<lang>' (lang is 'en' or 'es'). Always update BOTH " +
      "languages when changing copy. Never write revenue percentages, community-fund " +
      "numbers, or named-partner claims unless the operator explicitly says they are " +
      "signed — those stay governance-locked.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
        governance_locked: { type: "boolean" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "add_section",
    description:
      "Add a new structured block. kind is one of chapter|roadmap_stage|ally|fold|custom. " +
      "payload holds bilingual fields, e.g. {title_en, title_es, body_en, body_es, when}.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string" },
        position: { type: "number" },
        payload: { type: "object" },
      },
      required: ["kind", "payload"],
    },
  },
];

const SYSTEM = `You are ClaudIA, the internal operator for the Códice Vivo admin.
Códice Vivo is the cultural co-creation layer of The Mayan Experience: the Maya
communities of México and Guatemala are the authors. Governance is binding:
- No Maya glyphs/iconography instructions, no cultural claims about specific
  communities/advisors/institutions without written OK.
- No revenue percentages or community-fund numbers on the public page until the
  operator confirms agreements are signed; if unsure, keep them governance-locked.
- English and Spanish are peers — when you change copy, change BOTH languages.
- No founder/FlowBond branding on the public page; the steward stays functional.
You help the operator edit copy and add sections using the tools. Be concise.
Every action you take is logged. When you are unsure whether something is allowed,
ask rather than publish.`;

async function claudiaTurn(env: Env, actor: string, message: string) {
  // load recent thread for context
  const history: any[] = await rest(
    env,
    `codice_chat?thread=eq.main&order=id.desc&limit=16&select=role,content`
  );
  const msgs = history
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
  msgs.push({ role: "user", content: message });

  await rpc(env, "codice_chat_append", {
    p_thread: "main", p_role: "user", p_actor: actor, p_content: message, p_meta: null,
  });

  const applied: any[] = [];
  let reply = "";
  // simple two-hop tool loop
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: SYSTEM,
        tools: TOOLS,
        messages: msgs,
      }),
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${JSON.stringify(data)}`);
    msgs.push({ role: "assistant", content: data.content });
    const toolUses = (data.content || []).filter((b: any) => b.type === "tool_use");
    reply = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    if (toolUses.length === 0) break;

    const results: any[] = [];
    for (const t of toolUses) {
      try {
        if (t.name === "save_override") {
          await rpc(env, "codice_save_override", {
            p_actor: actor, p_key: t.input.key, p_value: t.input.value,
            p_locked: t.input.governance_locked ?? null,
          });
          applied.push({ tool: "save_override", ...t.input });
          results.push({ type: "tool_result", tool_use_id: t.id, content: "saved" });
        } else if (t.name === "add_section") {
          const id = await rpc(env, "codice_upsert_section", {
            p_actor: actor, p_id: null, p_kind: t.input.kind,
            p_position: t.input.position ?? 0, p_payload: t.input.payload, p_published: true,
          });
          applied.push({ tool: "add_section", id, ...t.input });
          results.push({ type: "tool_result", tool_use_id: t.id, content: `added ${id}` });
        } else {
          results.push({ type: "tool_result", tool_use_id: t.id, content: "unknown tool", is_error: true });
        }
      } catch (e: any) {
        results.push({ type: "tool_result", tool_use_id: t.id, content: String(e), is_error: true });
      }
    }
    msgs.push({ role: "user", content: results });
  }

  await rpc(env, "codice_chat_append", {
    p_thread: "main", p_role: "assistant", p_actor: actor,
    p_content: reply || "(edit applied)", p_meta: applied.length ? { applied } : null,
  });
  return { reply, applied };
}

// ---- router ---------------------------------------------------------------
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, params } = ctx;
  const parts = ([] as string[]).concat((params.route as string[]) || []);
  const head = parts[0] || "";
  const method = request.method.toUpperCase();

  try {
    const COOKIE = (token: string, maxAge: number) =>
      `cv_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

    // public: handle + access-code login -> signed session token (+ gate cookie)
    if (head === "login" && method === "POST") {
      const b: any = await request.json();
      const who = await login(env, String(b.handle || "").trim(), String(b.code || ""));
      if (!who) return J({ error: "invalid handle or code" }, 401);
      const token = await issue(env, who.handle, who.role);
      return new Response(JSON.stringify({ ok: true, token, who }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": COOKIE(token, 43200) },
      });
    }

    // public: clear the gate cookie
    if (head === "logout" && method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": COOKIE("", 0) },
      });
    }

    // everything below needs a valid session (private tool — no public reads)
    const who = await verifySession(request, env);
    if (!who) return J({ error: "unauthorized" }, 401);

    if (head === "site" && method === "GET") {
      const site = await rpc(env, "codice_site", {});
      return new Response(JSON.stringify(site), {
        headers: { "content-type": "application/json", "cache-control": "private, no-store" },
      });
    }
    if (head === "asset" && method === "GET") {
      if (!env.CODICE_ASSETS) return new Response("not found", { status: 404 });
      const key = parts.slice(1).join("/");
      const obj = await env.CODICE_ASSETS.get(key);
      if (!obj) return new Response("not found", { status: 404 });
      const h = new Headers();
      obj.writeHttpMetadata(h);
      h.set("cache-control", "private, max-age=31536000, immutable");
      return new Response(obj.body, { headers: h });
    }

    if (head === "state" && method === "GET") {
      const [overrides, sections, media, log, chat] = await Promise.all([
        rest(env, "codice_overrides?select=*&order=updated_at.desc"),
        rest(env, "codice_sections?select=*&deleted=eq.false&order=position"),
        rest(env, "codice_media?select=*&order=created_at.desc"),
        rest(env, "codice_activity_log?select=*&order=id.desc&limit=100"),
        rest(env, "codice_chat?thread=eq.main&select=*&order=id.asc&limit=100"),
      ]);
      return J({ who, overrides, sections, media, log, chat });
    }

    if (head === "save" && method === "POST") {
      const b: any = await request.json();
      await rpc(env, "codice_save_override", {
        p_actor: who.handle, p_key: b.key, p_value: b.value, p_locked: b.governance_locked ?? null,
      });
      return J({ ok: true });
    }

    if (head === "section" && method === "POST") {
      const b: any = await request.json();
      const id = await rpc(env, "codice_upsert_section", {
        p_actor: who.handle, p_id: b.id ?? null, p_kind: b.kind,
        p_position: b.position ?? 0, p_payload: b.payload ?? {}, p_published: b.published ?? true,
      });
      return J({ ok: true, id });
    }

    if (head === "media" && method === "POST") {
      if (!env.CODICE_ASSETS) return J({ error: "image upload no disponible aún — falta habilitar R2 en la cuenta" }, 503);
      const form = await request.formData();
      const file = form.get("file") as unknown as File;
      const slot = String(form.get("slot") || "");
      const ack = String(form.get("content_rule_ack") || "") === "true";
      if (!file || !slot) return J({ error: "file and slot required" }, 400);
      if (!ack) return J({ error: "content_rule_ack required (§2 hard content rule)" }, 400);
      const ext = (file.name.split(".").pop() || "webp").toLowerCase();
      const key = `codice/${slot}/${Date.now()}.${ext}`;
      await env.CODICE_ASSETS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "image/webp" },
      });
      const url = `/api/codice/asset/${key}`;
      const id = await rpc(env, "codice_add_media", {
        p_actor: who.handle, p_slot: slot, p_r2_key: key, p_url: url, p_ack: ack,
      });
      return J({ ok: true, id, url });
    }

    if (head === "release" && method === "POST") {
      if (who.role !== "super_admin") return J({ error: "super_admin only" }, 403);
      const b: any = await request.json();
      await rpc(env, "codice_release_governance", { p_actor: who.handle, p_key: b.key });
      return J({ ok: true });
    }

    if (head === "revert" && method === "POST") {
      const b: any = await request.json();
      await rpc(env, "codice_save_override", {
        p_actor: who.handle, p_key: b.key, p_value: b.value, p_locked: null,
      });
      await rpc(env, "codice_log", {
        p_actor: who.handle, p_action: "revert", p_target: b.key,
        p_before: null, p_after: { value: b.value },
      });
      return J({ ok: true });
    }

    if (head === "chat" && method === "POST") {
      const b: any = await request.json();
      const out = await claudiaTurn(env, who.handle, String(b.message || ""));
      return J({ ok: true, ...out });
    }

    return J({ error: "not found" }, 404);
  } catch (e: any) {
    return J({ error: String(e?.message || e) }, 500);
  }
};
