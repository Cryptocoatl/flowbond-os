// VPA claim — onboarding público de un perfil reclamable.
// El token del enlace (app_vpa_profile_claims.id) ES la credencial; por eso
// verify_jwt=false. Con service_role: valida el token, crea (o reutiliza) una
// cuenta auth CONFIRMADA con contraseña — sin depender del correo del proyecto,
// que no tiene SMTP — y liga el perfil vía vpa_complete_claim (RPC transaccional).
// Devuelve email+contraseña probada para que la página haga signInWithPassword.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const token = String(body.token || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!UUID.test(token)) return json({ error: "invalid token" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid email" }, 400);
  if (password.length < 8) return json({ error: "weak password" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 1) token debe estar activo y su perfil sin reclamar
  const { data: info, error: infoErr } = await admin.rpc("vpa_claim_info", { p_token: token });
  if (infoErr) return json({ error: infoErr.message }, 500);
  if (!info?.valid) return json({ error: "claim_invalid" }, 410);

  // 2) crear o reutilizar la cuenta auth (confirmada, con contraseña)
  let userId: string | null = null;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (cErr && /registered|already/i.test(cErr.message)) {
    // ya existe: buscarla y fijar esta contraseña (la persona la eligió ahora)
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list?.users?.find((x) => (x.email || "").toLowerCase() === email);
    if (!u) return json({ error: "user_lookup_failed" }, 500);
    userId = u.id;
    await admin.auth.admin.updateUser(userId, { password, email_confirm: true });
  } else {
    return json({ error: cErr?.message || "create_failed" }, 500);
  }

  // 3) FBID: debe existir una fila en public.flowbond_users(id=auth.uid). El
  //    trigger on_auth_user_created suele crearla; si no, la insertamos.
  await admin.from("flowbond_users").upsert({ id: userId, email }, { onConflict: "id" });

  // 4) ligar perfil + rol especialista (transaccional, valida token de nuevo)
  const { data: done, error: rErr } = await admin.rpc("vpa_complete_claim", { p_token: token, p_user: userId });
  if (rErr) return json({ error: rErr.message }, 409);

  return json({ ok: true, email, specialist_id: done?.specialist_id, slug: done?.slug });
});
