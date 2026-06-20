import { NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase-server';

// FlowBond ecosystem health check. One public, credential-free URL a monitor or
// cron can poll. It surfaces the auth/login-email delivery signal (the thing
// that caught Antonieta's broken login) AND the reachability of every live
// FlowBond app. 200 when healthy, 503 when something needs attention.
export const dynamic = 'force-dynamic';

// Every live surface in the ecosystem. (video.flowme.one / FLOW3 not deployed
// yet — add when it ships.) Reachability = responded <500 within the timeout;
// auth gates returning 401/403 still count as up (the server is alive).
const APPS: { name: string; url: string }[] = [
  // identity & login — the spine everything else logs in through
  { name: 'fbid_hub', url: 'https://fbid.flowbond.life' },
  { name: 'flowbond_life', url: 'https://flowbond.life' },
  { name: 'flowme', url: 'https://flowme.one' },
  { name: 'astroflow', url: 'https://astro.flowbond.life' },
  // products & surfaces
  { name: 'flowgarden', url: 'https://flowgarden.life' },
  { name: 'mountaindogs', url: 'https://mountaindogs.app' },
  { name: 'xelva', url: 'https://xelva.live' },
  { name: 'brandmark', url: 'https://brandmark.click' },
  { name: 'danz', url: 'https://danz-now.vercel.app' },
  { name: 'refirides', url: 'https://refirides-sigma.vercel.app' },
  { name: 'claudia', url: 'https://claudia-flowbond.vercel.app' },
  { name: 'flowstudio', url: 'https://flowstudio.flowme.one' },
  { name: 'raiz_translate', url: 'https://translate.flowme.one' },
  { name: 'origo', url: 'https://origo.flowme.one' },
  { name: 'deck', url: 'https://deck.flowbond.life' },
  // nations & community
  { name: 'flownation', url: 'https://flownation.world' },
  { name: 'flownation_cdmx', url: 'https://cdmx.flownation.world' },
  { name: 'moon_temple', url: 'https://moonchurch.space' },
  { name: 'issa_codex', url: 'https://lettheworldhearyourvoice.moonchurch.space' },
  // campaigns
  { name: 'tcf_promo', url: 'https://tcf-promo.vercel.app' },
];

async function ping(url: string): Promise<number> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 11000);
    const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(id);
    return res.status;
  } catch {
    return 0;
  }
}

export async function GET() {
  const checks: Record<string, unknown> = {};
  let ok = true;
  const degraded: string[] = [];

  // 1) Auth / login-email delivery (the magic-link signal)
  try {
    const sb = await serverClient();
    const { data, error } = await sb.schema('public').rpc('flowbond_health');
    if (error) throw error;
    checks.auth_email = data;
    if ((data as { auth_email?: string })?.auth_email !== 'ok') { ok = false; degraded.push('auth_email'); }
  } catch (e) {
    checks.auth_email = { status: 'error', detail: (e as Error)?.message ?? 'failed' };
    ok = false;
    degraded.push('auth_email');
  }

  // 2) Every app reachable (all checked in parallel)
  const results = await Promise.all(APPS.map(async (a) => ({ name: a.name, status: await ping(a.url) })));
  const apps: Record<string, string> = {};
  let up = 0;
  for (const r of results) {
    const isUp = r.status >= 200 && r.status < 500;
    apps[r.name] = isUp ? 'up' : `down(${r.status})`;
    if (isUp) up += 1;
    else { ok = false; degraded.push(r.name); }
  }
  checks.apps = apps;

  return NextResponse.json(
    {
      ok,
      status: ok ? 'healthy' : 'attention',
      checked_at: new Date().toISOString(),
      summary: { apps_total: APPS.length, apps_up: up, apps_down: APPS.length - up },
      degraded,
      checks,
    },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
