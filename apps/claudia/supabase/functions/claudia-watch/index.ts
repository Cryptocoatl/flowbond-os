// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · care engine  (supabase/functions/claudia-watch)  — master spec §7
//
//  Runs on pg_cron every 15 minutes. For each opted-in user it evaluates
//  time-since-last meal/water/rest, and — only outside quiet hours, only if a
//  threshold is crossed, only if there isn't already an undelivered nudge of
//  that kind — inserts a nudge row holding ONLY (kind + timing). The warm copy
//  is rendered client-side; the database never holds a word of it.
//
//  All the logic lives in the SECURITY DEFINER RPC claudia_due_nudges() so the
//  rules (quiet hours, dedupe, opt-in) are enforced once, in the database. This
//  function is the thin invoker; it uses the service-role key — which, by §0,
//  still cannot read a single byte of message/task content (all ciphertext).
//
//  Deploy:  supabase functions deploy claudia-watch
//  Schedule: see ./cron.sql (pg_cron). Quiet hours + dedupe + opt-in are what
//  keep her loving instead of nagging — that distinction is the whole product.
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'unconfigured' }), { status: 503 });
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('claudia_due_nudges');

  if (error) {
    // Status only — never echo content (there is none here, but stay disciplined).
    return new Response(JSON.stringify({ error: 'due-nudges-failed' }), { status: 500 });
  }

  // Emit a count only. No user ids, no kinds, nothing correlatable in logs.
  return new Response(JSON.stringify({ inserted: (data ?? []).length }), {
    headers: { 'content-type': 'application/json' },
  });
});
