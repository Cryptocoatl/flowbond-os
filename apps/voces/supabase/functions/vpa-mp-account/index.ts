// vpa-mp-account — diagnóstico de la cuenta MercadoPago conectada (solo super_admin).
// Detecta si el token es de un USUARIO DE PRUEBA (nickname TESTUSER*) para avisar en /admin.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // 1) gatear a super_admin usando el JWT del que llama
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: role } = await caller.rpc("vpa_my_role");
    if (role !== "super_admin") return json({ error: "forbidden" }, 403);

    // 2) leer el token (service_role) y consultar la cuenta en MercadoPago
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: cfg } = await admin.rpc("vpa__payment_config");
    const token = cfg?.vpa_mp_access_token;
    if (!token) return json({ configured: false });

    const r = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return json({ configured: true, ok: false, note: `mp ${r.status}` });
    const u = await r.json();
    const nickname: string = u?.nickname || "";
    const st = u?.status || {};
    return json({
      configured: true,
      ok: true,
      nickname,
      is_test_user: /^TEST/i.test(nickname),
      site_status: st?.site_status,
      can_sell: !!st?.sell?.allow,
      email_confirmed: !!st?.confirmed_email,
      account_type: st?.mercadopago_account_type,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
