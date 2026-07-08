'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Empire uptime client  (lib/claudia/uptime.ts)
//
//  Thin fetch wrapper over /api/claudia/uptime. The heartbeat runs server-side;
//  here we just ask for the latest map and hand it to MissionsPanel / the grid.
// ════════════════════════════════════════════════════════════════════════

export type UptimeState = 'up' | 'down' | 'unknown';

export interface UptimeReport {
  status: Record<string, UptimeState>;
  up: number;
  total: number;
  checkedAt: string;
}

/** Ask the server for a fresh liveness map of the empire. */
export async function fetchUptime(): Promise<UptimeReport> {
  const res = await fetch('/api/claudia/uptime', { cache: 'no-store' });
  if (!res.ok) throw new Error('uptime-failed');
  return (await res.json()) as UptimeReport;
}
