import { NextRequest, NextResponse } from 'next/server';
import { getProfileByHandle } from '../../../lib/astro/access';
import { natalAspects } from '../../../lib/astro/aspects';
import { personLines, panorama, interpretAspect, roleOf } from '../../../lib/astro/interpret';
import { rankPlaces, LINE_MEANING } from '../../../lib/astro/astrocartography';
import { serverClient } from '../../../lib/supabase-server';
import type { RelContext, EcosystemPlace } from '../../../lib/astro/types';

// Model is env-configurable; see https://docs.claude.com/en/docs/about-claude/models
const MODEL = process.env.ASTROFLOW_READING_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM = `You are AstroFlow's reading voice: a warm, precise, plain-language guide.
You are given FACTS that were computed deterministically from real birth data
(degree-accurate positions, houses, and weighted aspects). Your job is to turn
those facts into a flowing, human reading — never invent placements or aspects
beyond the facts provided. Honor the relationship context: the same aspect means
something different in friendship vs romance vs co-living vs business. Speak in
terms of patterns and tendencies ("tends to", "leans"), never fixed destiny.
Be specific and useful, not generic. ~280 words. No headers, no bullet lists.`;

async function callClaude(facts: unknown, ask: string) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${ask}\n\nFACTS:\n${JSON.stringify(facts, null, 2)}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { handles, context = 'friendship' } = (await req.json()) as { handles: string[]; context?: RelContext };
    if (!Array.isArray(handles) || handles.length === 0) {
      return NextResponse.json({ error: 'handles required' }, { status: 400 });
    }

    const lookups = await Promise.all(handles.map(getProfileByHandle));
    const blocked = lookups.find((l) => l.status !== 'ok');
    if (blocked) {
      return NextResponse.json(
        { error: blocked.status === 'forbidden' ? 'You do not have access to one of these charts.' : 'Unknown handle.' },
        { status: blocked.status === 'forbidden' ? 403 : 404 },
      );
    }
    const profiles = lookups.map((l) => (l as { profile: any }).profile);

    let facts: unknown;
    let ask: string;

    if (profiles.length === 1) {
      const p = profiles[0];
      const sb = await serverClient();
      const { data: placeRows } = await sb.from('ecosystem_places').select('*');
      const places = (placeRows ?? []).map((r: any) => ({ id: r.id, name: r.name, kind: r.kind, lat: r.lat, lng: r.lng })) as EcosystemPlace[];
      const acg = rankPlaces(p.chart, places, 4).slice(0, 4).map((r) => ({
        place: r.place.name,
        lines: r.activations.slice(0, 2).map((a) => `${a.planet}-${a.kind} (${LINE_MEANING[a.kind]}, ${a.orbDeg}°)`),
      }));
      facts = {
        name: p.displayName,
        bigThree: { sun: p.chart.bodies.Sun.sign, moon: p.chart.bodies.Moon.sign, rising: p.chart.asc?.sign ?? 'unknown (no birth time)' },
        placements: personLines(p.chart).map((x) => x.line),
        natalAspects: natalAspects(p.chart).slice(0, 8).map((a) => `${a.p1} ${a.glyph} ${a.p2} (${a.orb}°)`),
        elements: p.chart.elements,
        ecosystemActivations: acg,
      };
      ask = `Write a personal reading for ${p.displayName}. Open with who they are at core (the big three), weave in the most defining placements and aspects, and close with where in the FlowBond ecosystem their chart is most "activated" (the astrocartography lines) — and what that suggests for retreats, building, or gathering there.`;
    } else {
      const [a, b] = profiles;
      const pan = panorama(a.chart, b.chart, context);
      facts = {
        people: [a.displayName, b.displayName],
        context,
        score: pan.score,
        defining: pan.headline,
        whatFlows: pan.flows.map((f) => interpretAspect(f.aspect, context)),
        friction: pan.friction.map((f) => interpretAspect(f.aspect, context)),
        guidance: pan.advice,
        bigThree: profiles.map((p) => ({ name: p.displayName, sun: p.chart.bodies.Sun.sign, moon: p.chart.bodies.Moon.sign, rising: p.chart.asc?.sign ?? '—' })),
      };
      ask = `Write a ${context} compatibility reading for ${a.displayName} and ${b.displayName}. Explain the defining current between them, what flows and what creates friction in THIS context specifically, and what they can do to thrive together.`;
    }

    const reading = await callClaude(facts, ask);
    return NextResponse.json({ reading, model: MODEL });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'reading failed' }, { status: 500 });
  }
}
