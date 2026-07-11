'use client';

import { browserClient } from '@/lib/supabase';

/**
 * Anonymous journey analytics for /openflow. No PII — event name, small jsonb
 * detail, truncated UA hint. Writes go through the SECURITY DEFINER RPC
 * `openflow_log_event` (table is RLS deny-by-default). Fire-and-forget:
 * analytics must never block or break the experience.
 */

export type OpenflowEvent =
  | 'gate_unlocked'
  | 'gate_failed'
  | 'welcome_viewed'
  | 'chapter_viewed'
  | 'pdf_downloaded'
  | 'closing_viewed';

let sb: ReturnType<typeof browserClient> | null = null;
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
    sb ??= browserClient();
    void sb
      .rpc('openflow_log_event', {
        p_event: event,
        p_detail: detail,
        p_ua: navigator.userAgent.slice(0, 160),
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* analytics never throws */
  }
}
