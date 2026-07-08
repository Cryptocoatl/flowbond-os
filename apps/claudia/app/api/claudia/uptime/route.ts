import { NextResponse } from 'next/server';
import { EMPIRE } from '../../../../lib/claudia/empire';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Empire UPTIME  (/api/claudia/uptime)
//
//  Server-side liveness ping of every LIVE world in the empire. Done here (not
//  in the browser) so we sidestep CORS and never expose the sovereign's IP to
//  every app. It only touches PUBLIC front doors — the same URLs anyone can
//  open — reads the HTTP status, and returns a compact { slug: state } map.
//  Nothing is stored or logged; it's a heartbeat, not surveillance.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type State = 'up' | 'down' | 'unknown';
const TIMEOUT_MS = 5000;

async function ping(url: string): Promise<State> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // GET (some hosts reject HEAD); we only read the status line, not the body.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'ClaudIA-uptime/1.0' },
      cache: 'no-store',
    });
    // Any answer < 500 means the door opened (401/403 = up but gated).
    return res.status < 500 ? 'up' : 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const live = EMPIRE.filter((a) => a.status === 'live' && a.url);
  const results = await Promise.all(
    live.map(async (a) => [a.slug, await ping(a.url as string)] as const),
  );
  const status: Record<string, State> = {};
  for (const [slug, state] of results) status[slug] = state;
  // building apps have no public door yet → explicitly unknown
  for (const a of EMPIRE) if (a.status !== 'live' || !a.url) status[a.slug] = 'unknown';

  const up = results.filter(([, s]) => s === 'up').length;
  return NextResponse.json(
    { status, up, total: live.length, checkedAt: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
