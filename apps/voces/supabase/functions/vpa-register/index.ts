// VPA register — registro instantáneo (modelo A): crea una cuenta auth CONFIRMADA
// con contraseña (sin depender de SMTP) + el perfil de especialista en status
// 'hidden', y devuelve email+contraseña para que la página haga signInWithPassword
// y enrute al pago (/unete). El perfil se PUBLICA cuando el pago se activa.
// verify_jwt=false: onboarding público con validación propia (igual que vpa-claim).
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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  // honeypot: si el campo trampa viene lleno, es bot → cortar.
  if (String(body.hp || body.company || "").trim()) return json({ error: "spam" }, 400);

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const categoryId = String(body.category_id || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 400);
  if (password.length < 8) return json({ error: "weak_password" }, 400);
  if (name.length < 2 || name.length > 120) return json({ error: "invalid_name" }, 400);
  if (!UUID.test(categoryId)) return json({ error: "category_required" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // rate limit por IP (anti-flood): máx 8 registros/hora por IP
  const ip = req.headers.get("cf-connecting-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const { data: rateOk } = await admin.rpc("vpa__register_rate_ok", { p_ip: ip });
  if (rateOk === false) return json({ error: "rate_limited" }, 429);

  // 1) crear la cuenta auth (confirmada, con contraseña).
  //    SEGURIDAD: si el correo YA existe, NO tocamos su contraseña (evita toma de
  //    cuenta desde un endpoint público). La persona debe iniciar sesión: la página
  //    lo detecta con 'email_exists' y usa vpa_register_my_profile (autenticada).
  let userId: string | null = null;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (cErr && /registered|already|exists/i.test(cErr.message)) {
    return json({ error: "email_exists" }, 409);
  } else {
    return json({ error: cErr?.message || "create_failed" }, 500);
  }

  // 2) FBID en public.flowbond_users
  await admin.from("flowbond_users").upsert({ id: userId, email }, { onConflict: "id" });

  // 3) crear el perfil de especialista (status 'hidden' hasta pagar)
  const payload = {
    name,
    email,
    category_id: categoryId,
    headline: body.headline ?? "",
    what_do: body.what_do ?? "",
    mission: body.mission ?? "",
    phone: body.phone ?? "",
    website: body.website ?? "",
    socials: body.socials ?? {},
    certifications: body.certifications ?? "",
    langs: body.langs ?? ["es"],
    modalities: body.modalities ?? ["online"],
    photo_path: body.photo_path ?? "",
    offerings: body.offerings ?? [],
  };
  const { data: prof, error: rErr } = await admin.rpc("vpa_register_specialist", { p_user: userId, payload });
  if (rErr) {
    // rollback: si el perfil falla, borra la cuenta recién creada (evita huérfanos)
    try { await admin.auth.admin.deleteUser(userId); } catch (_) { /* best effort */ }
    return json({ error: rErr.message }, 409);
  }

  return json({ ok: true, email, specialist_id: prof?.specialist_id, slug: prof?.slug });
});
