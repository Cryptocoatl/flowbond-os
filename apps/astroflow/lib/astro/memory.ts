/**
 * Per-FBID memory layer (server-only). Two jobs:
 *  1. CACHE the heavy reading facts so the API + model don't re-derive a chart
 *     every reading — computed once, reused until the chart changes.
 *  2. Hold a small PRIVATE memory FlowMe can grow about the user, so readings
 *     stay consistent over time.
 *
 * Security: every call goes through the user's own authenticated Supabase
 * session; astroflow.profile_memory RLS is owner-only (fbid = current_fbid()),
 * so a caller can ONLY ever touch their own row. There is no cross-user path and
 * no path from prompt text to anything but this row's data.
 */
import { serverClient } from '../supabase-server';
import { natalAspects } from './aspects';
import { personLines } from './interpret';
import { vedicChart, vedicSummary, vimshottariDasha } from './vedic';
import { mayanSummary } from './mayan';
import { geneKeys, geneKeysSummary } from './genekeys';
import { strongestSpot } from './acg-geo';
import type { Chart } from './types';

export interface ChartFacts {
  placements: string[];
  aspects: string[];
  elements: Chart['elements'];
  modalities: Chart['modalities'];
  vedic: ReturnType<typeof vedicSummary>;
  vimshottari: ReturnType<typeof vimshottariDasha>;
  mayan: ReturnType<typeof mayanSummary>;
  geneKeys: ReturnType<typeof geneKeysSummary>;
  strongestSpot: ReturnType<typeof strongestSpot>;
}

/** Stable, cheap hash of the chart — changes iff a placement/angle/jd changes. */
export function hashChart(chart: Chart): string {
  const s = JSON.stringify({ b: chart.bodies, a: chart.asc, m: chart.mc, n: chart.node, jd: chart.jd });
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Derive the full fact bundle from a chart (the expensive part). */
export function buildFacts(chart: Chart, birthDate: string): ChartFacts {
  return {
    placements: personLines(chart).map((x) => x.line),
    aspects: natalAspects(chart)
      .slice(0, 9)
      .map((a) => `${a.p1} ${a.glyph} ${a.p2} (${a.orb}°, ${a.harmony > 0 ? 'flowing' : 'forging'})`),
    elements: chart.elements,
    modalities: chart.modalities,
    vedic: vedicSummary(vedicChart(chart)),
    vimshottari: vimshottariDasha(chart),
    mayan: mayanSummary(chart.jd, birthDate),
    geneKeys: geneKeysSummary(geneKeys(chart)),
    strongestSpot: strongestSpot(chart),
  };
}

/**
 * Return cached facts for the OWNER's own chart, computing + storing them if the
 * cache is empty or stale. Only valid for the caller's own fbid (RLS enforces
 * it); for anyone else, fall back to buildFacts() without persisting.
 */
export async function getOrBuildFacts(fbid: string, chart: Chart, birthDate: string): Promise<ChartFacts> {
  const hash = hashChart(chart);
  try {
    const sb = await serverClient();
    const { data } = await sb.from('profile_memory').select('facts, facts_hash').eq('fbid', fbid).maybeSingle();
    if (data?.facts_hash === hash && data.facts && Object.keys(data.facts).length) return data.facts as ChartFacts;

    const facts = buildFacts(chart, birthDate);
    // RLS lets this through only when fbid is the caller's own; otherwise it's a
    // no-op and we still return freshly-built facts.
    await sb.from('profile_memory').upsert(
      { fbid, facts, facts_hash: hash, facts_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'fbid' },
    );
    return facts;
  } catch {
    return buildFacts(chart, birthDate); // never let caching break a reading
  }
}

export interface MemoryEntry { at: string; kind: string; note: string }

/** The user's private memory list (owner-only). */
export async function loadMemory(fbid: string): Promise<MemoryEntry[]> {
  try {
    const sb = await serverClient();
    const { data } = await sb.from('profile_memory').select('memory').eq('fbid', fbid).maybeSingle();
    return (data?.memory as MemoryEntry[]) ?? [];
  } catch {
    return [];
  }
}

/** Append one private note (owner-only; capped, newest kept). */
export async function appendMemory(fbid: string, kind: string, note: string): Promise<void> {
  try {
    const sb = await serverClient();
    const prev = await loadMemory(fbid);
    const next = [...prev, { at: new Date().toISOString(), kind, note: note.slice(0, 400) }].slice(-50);
    await sb.from('profile_memory').upsert(
      { fbid, memory: next, updated_at: new Date().toISOString() },
      { onConflict: 'fbid' },
    );
  } catch { /* memory is best-effort, never block the request */ }
}
