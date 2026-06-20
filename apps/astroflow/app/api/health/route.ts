import { NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase-server';

// FlowBond health check. One public, credential-free URL a monitor (or a cron)
// can poll. It surfaces the signal that would have caught Antonieta's broken
// login automatically: people signing up but never completing = the magic-link
// email isn't being delivered. Also confirms the FBID login hub and key apps
// are reachable. Returns 200 when healthy, 503 when something needs attention.
export const dynamic = 'force-dynamic';

const APPS = [
  { name: 'astroflow', url: 'https://astro.flowbond.life' },
  { name: 'fbid_hub', url: 'https://fbid.flowbond.life' },
  { name: 'flowme', url: 'https://flowme.one' },
  { name: 'flowbond_life', url: 'https://flowbond.life' },
];

async function ping(url: string): Promise<number> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 8000);
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

  // 1) Auth / login-email delivery (the magic-link signal)
  try {
    const sb = await serverClient();
    const { data, error } = await sb.schema('public').rpc('flowbond_health');
    if (error) throw error;
    checks.auth_email = data;
    if ((data as { auth_email?: string })?.auth_email !== 'ok') ok = false;
  } catch (e) {
    checks.auth_email = { status: 'error', detail: (e as Error)?.message ?? 'failed' };
    ok = false;
  }

  // 2) Login hub + key apps reachable (any response <500 = the server is up;
  //    auth gates returning 401/403 still count as reachable)
  const results = await Promise.all(APPS.map(async (a) => ({ name: a.name, status: await ping(a.url) })));
  const apps: Record<string, string> = {};
  for (const r of results) {
    const up = r.status >= 200 && r.status < 500;
    apps[r.name] = up ? 'up' : `down(${r.status})`;
    if (!up) ok = false;
  }
  checks.apps = apps;

  return NextResponse.json(
    { ok, status: ok ? 'healthy' : 'attention', checked_at: new Date().toISOString(), checks },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
