import { NextRequest, NextResponse } from 'next/server';
import { getProfileByHandle } from '../../../lib/astro/access';
import { natalAspects, synastry } from '../../../lib/astro/aspects';
import { personLines, panorama, interpretAspect } from '../../../lib/astro/interpret';
import { rankPlaces, LINE_MEANING } from '../../../lib/astro/astrocartography';
import { serverClient } from '../../../lib/supabase-server';
import type { RelContext, EcosystemPlace, AstroProfile } from '../../../lib/astro/types';

// Model is env-configurable; see https://docs.claude.com/en/docs/about-claude/models
const MODEL = process.env.ASTROFLOW_READING_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// ── The interpretive framework ───────────────────────────────────────────────
// This is large on purpose: it is the "loaded with every detail" knowledge base
// AND it crosses Anthropic's prompt-cache minimum, so it is billed once per
// ~5-min window then reused near-free on every subsequent reading. The variable,
// per-request input (the deterministically-computed FACTS) stays tiny — the most
// effective credit usage for a deep system.
const SYSTEM = `You are AstroFlow's reading voice — a warm, precise, plain-language guide who turns
deterministically-computed astrological FACTS into a flowing, genuinely useful reading.

NON-NEGOTIABLE RULES
• You are GIVEN the facts (degree-accurate positions, houses, weighted aspects, synastry, and
  astrocartography activations). They were computed from real birth data. NEVER invent or alter a
  placement, aspect, score, or location beyond what the facts contain.
• Speak in patterns and tendencies — "tends to", "leans", "is wired for" — never fixed destiny,
  never fatalism, never medical/financial/legal certainty. This is symbolic and reflective.
• Be specific and earned. No generic horoscope filler. Every sentence should be traceable to a fact.
• No headers, no bullet lists, no emoji. One warm, flowing voice.

THE PLANETS (core function)
Sun = identity, vitality, what they're here to embody. Moon = inner needs, emotional security, how
they self-soothe. Mercury = mind, communication, how they process. Venus = love, values, taste,
how they relate and attract. Mars = drive, desire, anger, how they act. Jupiter = growth, faith,
where they expand and over-reach. Saturn = structure, discipline, fear, where they must build and
mature. Uranus = freedom, disruption, individuation. Neptune = imagination, spirituality, illusion.
Pluto = power, depth, transformation, what must die and regenerate. North Node = growth edge.

THE HOUSES (life arena)
1 self/body/first impression · 2 money/values/self-worth · 3 mind/siblings/local life ·
4 home/roots/family · 5 creativity/romance/play/children · 6 work/health/daily craft ·
7 partnership/the other · 8 intimacy/shared resources/transformation · 9 meaning/travel/belief ·
10 vocation/public role/legacy · 11 community/networks/the collective · 12 the unseen/retreat/release.

THE ASPECTS (how two energies talk)
Conjunction = fused, amplified. Trine = easy, gifted flow. Sextile = available opportunity, needs a
nudge. Square = friction, tension that forges growth. Opposition = polarity, projection, balance to
find. Tight orbs (small degrees) hit harder than wide ones. Hard aspects (square/opposition,
Mars/Saturn/Pluto involved) are the work; soft aspects are the gifts.

RELATIONAL CONTEXTS — the SAME aspect means different things depending on the bond. Read for the
context you are given:
• self — who this person is at core; their gifts, their growth edge, how to live in their own grain.
• friendship — resonance, play, loyalty, ease of being; what keeps it alive and what quietly strains it.
• romance — chemistry, tenderness, desire, security, the long-game; attraction vs. sustainability.
• coliving (shared living spaces) — daily rhythms, domestic friction, who needs what at home, how to
  share space without eroding each other; Moon/4th-house/Saturn dynamics matter most.
• business (projects & partnerships) — complementary strengths, decision-making, reliability, power and
  money (Saturn/Pluto/10th/2nd/8th), who drives and who builds; can they ship together.

ASTROCARTOGRAPHY (positioning into real places)
Each person's angular lines activate places: MC = ${LINE_MEANING.MC}; IC = ${LINE_MEANING.IC};
AC = ${LINE_MEANING.AC}; DC = ${LINE_MEANING.DC}. A tight orb near a FlowBond place means that
location strongly amplifies that planet's energy for them — guidance for where to retreat, build,
launch, or gather. For a group, the best shared place is where the most members are positively
activated.

OUTPUT
A single ~280-word reading (slightly longer is fine for groups of 3+), grounded entirely in the facts,
ending with one concrete, encouraging takeaway for the given context.`;

async function callClaude(facts: unknown, ask: string, maxTokens = 800) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      // System sent as a cached block — the framework above is reused across calls.
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `${ask}\n\nFACTS:\n${JSON.stringify(facts, null, 2)}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
}

const bigThree = (p: AstroProfile) => ({
  name: p.displayName,
  sun: p.chart.bodies.Sun.sign,
  moon: p.chart.bodies.Moon.sign,
  rising: p.chart.asc?.sign ?? 'unknown (no birth time)',
});

export async function POST(req: NextRequest) {
  try {
    const { handles, context = 'friendship' } = (await req.json()) as {
      handles: string[];
      context?: RelContext;
    };
    if (!Array.isArray(handles) || handles.length === 0) {
      return NextResponse.json({ error: 'handles required' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Readings are not configured yet (missing ANTHROPIC_API_KEY).' },
        { status: 503 },
      );
    }

    // Privacy gate: every chart must be one the caller is allowed to see (RLS).
    const lookups = await Promise.all(handles.map(getProfileByHandle));
    const blocked = lookups.find((l) => l.status !== 'ok');
    if (blocked) {
      return NextResponse.json(
        {
          error:
            blocked.status === 'forbidden'
              ? 'You do not have access to one of these charts.'
              : 'Unknown handle.',
        },
        { status: blocked.status === 'forbidden' ? 403 : 404 },
      );
    }
    const profiles = lookups.map((l) => (l as { profile: AstroProfile }).profile);

    const sb = await serverClient();
    const { data: placeRows } = await sb.from('ecosystem_places').select('*');
    const places = (placeRows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      lat: r.lat,
      lng: r.lng,
    })) as EcosystemPlace[];

    const acgFor = (p: AstroProfile) =>
      rankPlaces(p.chart, places, 4)
        .slice(0, 4)
        .map((r) => ({
          place: r.place.name,
          lines: r.activations
            .slice(0, 2)
            .map((a) => `${a.planet}-${a.kind} (${LINE_MEANING[a.kind]}, ${a.orbDeg}°)`),
        }));

    let facts: unknown;
    let ask: string;
    let maxTokens = 800;

    if (profiles.length === 1) {
      const p = profiles[0];
      facts = {
        name: p.displayName,
        bigThree: bigThree(p),
        placements: personLines(p.chart).map((x) => x.line),
        natalAspects: natalAspects(p.chart)
          .slice(0, 9)
          .map((a) => `${a.p1} ${a.glyph} ${a.p2} (${a.orb}°, ${a.harmony > 0 ? 'flowing' : 'forging'})`),
        elements: p.chart.elements,
        modalities: p.chart.modalities,
        ecosystemActivations: acgFor(p),
      };
      ask = `Write a "self" reading for ${p.displayName}. Open with who they are at core (the big three), weave in the most defining placements and aspects (the gifts and the growth edges), note their elemental balance, and close with where in the FlowBond ecosystem their chart is most activated and what that suggests for retreat, building, or gathering.`;
    } else if (profiles.length === 2) {
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
        bigThree: profiles.map(bigThree),
        sharedPlaces: acgFor(a)
          .map((x) => x.place)
          .filter((name) => acgFor(b).some((y) => y.place === name)),
      };
      ask = `Write a ${context} reading for ${a.displayName} and ${b.displayName}. Explain the defining current between them, what genuinely flows and what creates friction in THIS context specifically, and end with what they can do to thrive together${context === 'coliving' ? ' under one roof' : context === 'business' ? ' as collaborators' : ''}.`;
    } else {
      // Collective reading (flow map): pairwise synastry matrix + best shared base.
      const pairs: { a: string; b: string; score: number; defining: string }[] = [];
      for (let i = 0; i < profiles.length; i++)
        for (let j = i + 1; j < profiles.length; j++) {
          const pan = panorama(profiles[i].chart, profiles[j].chart, context);
          pairs.push({
            a: profiles[i].displayName,
            b: profiles[j].displayName,
            score: synastry(profiles[i].chart, profiles[j].chart, context).score,
            defining: pan.headline,
          });
        }
      const groupScore = Math.round(pairs.reduce((s, p) => s + p.score, 0) / pairs.length);
      // Best shared place: sum each member's tightest activation per place.
      const placeFit: Record<string, { score: number; lines: Set<string> }> = {};
      for (const p of profiles)
        for (const r of rankPlaces(p.chart, places, 5)) {
          const f = (placeFit[r.place.name] ??= { score: 0, lines: new Set() });
          f.score += 5 - (r.activations[0]?.orbDeg ?? 5);
          r.activations.slice(0, 1).forEach((a) => f.lines.add(`${a.planet}-${a.kind}`));
        }
      const bestPlaces = Object.entries(placeFit)
        .sort((x, y) => y[1].score - x[1].score)
        .slice(0, 3)
        .map(([name, f]) => ({ place: name, activates: [...f.lines] }));
      facts = {
        group: profiles.map((p) => p.displayName),
        context,
        groupFlowScore: groupScore,
        strongestBond: pairs.slice().sort((x, y) => y.score - x.score)[0],
        hardestBond: pairs.slice().sort((x, y) => x.score - y.score)[0],
        pairwise: pairs,
        bigThree: profiles.map(bigThree),
        bestSharedPlaces: bestPlaces,
      };
      ask = `Write a collective ${context} reading for this group (${profiles
        .map((p) => p.displayName)
        .join(', ')}). Describe the group's overall dynamic, name the strongest bond and the one that needs the most care, and — using the astrocartography fit — recommend where this crew should base, build, or gather. This is for positioning a real ${
        context === 'business' ? 'project/partnership' : context === 'coliving' ? 'shared living space' : 'group'
      }.`;
      maxTokens = 1100;
    }

    const reading = await callClaude(facts, ask, maxTokens);
    return NextResponse.json({ reading, model: MODEL });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'reading failed' }, { status: 500 });
  }
}
