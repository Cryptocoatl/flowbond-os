'use client';

/**
 * Anonymous journey analytics for /openflow. No PII — event name, small jsonb
 * detail, truncated UA hint. Writes go through the SECURITY DEFINER RPC
 * `openflow_log_event` (table is RLS deny-by-default). Fire-and-forget:
 * analytics must never block or break the experience. The Supabase client is
 * dynamic-imported on first use so it stays out of the critical render path.
 */

export type OpenflowEvent =
  | 'gate_unlocked'
  | 'gate_failed'
  | 'welcome_viewed'
  | 'chapter_viewed'
  | 'pdf_downloaded'
  | 'closing_viewed';

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown> };
let sbPromise: Promise<Rpc> | null = null;
const SEEN_KEY = 'openflow:logged';

function seen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function logOpenflow(
  event: OpenflowEvent,
  detail: Record<string, unknown> = {},
  oncePerSession = true,
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${event}:${JSON.stringify(detail)}`;
    if (oncePerSession) {
      const s = seen();
      if (s.has(key)) return;
      s.add(key);
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
    }
    sbPromise ??= import('@/lib/supabase').then((m) => m.browserClient() as unknown as Rpc);
    void sbPromise
      .then((sb) =>
        sb.rpc('openflow_log_event', {
          p_event: event,
          p_detail: detail,
          p_ua: navigator.userAgent.slice(0, 160),
        }),
      )
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* analytics never throws */
  }
}
