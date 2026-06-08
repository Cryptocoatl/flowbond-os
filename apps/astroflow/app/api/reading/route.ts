import { NextRequest, NextResponse } from 'next/server';
import { atLeast, getProfileByHandle, logChartRead, myFbid, myLevelOn } from '../../../lib/astro/access';
import { synastry } from '../../../lib/astro/aspects';
import { panorama, interpretAspect } from '../../../lib/astro/interpret';
import { rankPlaces, LINE_MEANING } from '../../../lib/astro/astrocartography';
import { serverClient } from '../../../lib/supabase-server';
import { getOrBuildFacts, buildFacts, appendMemory, type ChartFacts } from '../../../lib/astro/memory';
import type { RelContext, EcosystemPlace, AstroProfile } from '../../../lib/astro/types';

// Which symbolic system(s) to read through. 'comparison' reads the SAME person
// through two systems side by side (western vs vedic, gene keys vs the chart).
export type ReadingSystem = 'western' | 'vedic' | 'mayan' | 'genekeys' | 'comparison' | 'unified';
const SYSTEMS: ReadingSystem[] = ['western', 'vedic', 'mayan', 'genekeys', 'comparison', 'unified'];

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

OTHER TRADITIONS — when the facts include them, read them on their own terms:
• Vedic (sidereal): rashis and nakshatras describe the karmic texture beneath the western
  personality layer; the nakshatra lord and Vimshottari dasha describe the CURRENT chapter of life.
  Never mix sidereal and tropical signs as if they disagreed — they are two lenses, not a contradiction.
• Mayan: the Traditional (GMT) day sign + tone is the ancestral count; Dreamspell is the modern
  galactic overlay. Read the day sign as the person's "face of the day" and the Dreamspell oracle
  (guide/analog/antipode/occult) as their working team of energies. Keep the two counts distinct.
• Gene Keys / Human Design: each gate carries a shadow → gift → siddhi arc. Read the shadow as the
  contracted pattern, the gift as the unlocked expression, the siddhi as the far star. The four prime
  spheres (Life's Work, Evolution, Radiance, Purpose) are the spine of the reading. Profile lines
  describe HOW they move through it.
• COMPARISON readings: when asked to compare two systems for the SAME person, find where the lenses
  AGREE (that's the loudest signal in the chart) and where they reveal different layers (western =
  personality weather, vedic = karmic ground, gene keys = evolutionary arc). Never declare one system
  "right" — show what each sees that the others can't.

ASTROCARTOGRAPHY (positioning into real places)
Each person's angular lines activate places: MC = ${LINE_MEANING.MC}; IC = ${LINE_MEANING.IC};
AC = ${LINE_MEANING.AC}; DC = ${LINE_MEANING.DC}. A tight orb near a FlowBond place means that
location strongly amplifies that planet's energy for them — guidance for where to retreat, build,
launch, or gather. For a group, the best shared place is where the most members are positively
activated.

WHEN THE PERSON BRINGS A QUESTION
Sometimes the facts include a QUESTION the person is holding — a decision, a tension, a dream.
Reflect it through the chart symbols: show which of their currents the question touches, what each
side of the choice asks of them, and where their chart suggests ease or friction. You are a mirror,
not an oracle of answers — NEVER tell them what to decide, never predict outcomes. Help them see
their own question more clearly, and close with ONE reflective question that helps the decision
align with their stars.

UNIFIED readings: when asked to unify, weave ALL the lenses in the facts into one clear, plain-language
resume of a few short paragraphs — what every tradition agrees on said once and strongly, then what each
adds. No jargon walls; a person new to astrology should understand every sentence.

PRIVACY & TRUST (FlowBond privacy layer)
You receive ONLY symbolic data: first names and deterministically-computed chart symbols. You are
never given — and must never ask for, infer, or speculate about — surnames, birth dates, birth
places, locations, contact details, or any other identifying information. If a fact seems to imply
something personal beyond the symbols, do not surface it. Each reading is a single, self-contained
transmission: you have no memory of past readings and must never imply that you remember anyone.

OUTPUT
A single ~280-word reading (slightly longer is fine for groups of 3+), grounded entirely in the facts,
ending with one concrete, encouraging takeaway for the given context.`;

// ── Privacy layer ────────────────────────────────────────────────────────────
// The model is only ever shown FIRST NAMES + computed chart symbols. Handles,
// FBIDs, emails, birth dates/times/places and coordinates never leave the
// backend. Readings are stateless: nothing is persisted on either side beyond
// this single request/response (the API is used for inference only — inputs
// are not used for training), so every transmission lives and dies inside
// FlowBond's privacy layer.
const firstName = (p: AstroProfile) => (p.displayName ?? '').trim().split(/\s+/)[0] || 'this soul';

async function channelFlowMe(facts: unknown, ask: string, maxTokens = 800) {
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
      // System sent as a cached block — FlowMe's generic knowledge is loaded
      // once per hour, then reused near-free: the collective framework lives
      // in cache, only the tiny per-reading facts cost fresh tokens.
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral', ttl: '1h' } }],
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
  name: firstName(p),
  sun: p.chart.bodies.Sun.sign,
  moon: p.chart.bodies.Moon.sign,
  rising: p.chart.asc?.sign ?? 'unknown (no birth time)',
});

export async function POST(req: NextRequest) {
  try {
    const { handles, mapId, context = 'friendship', system = 'western', question } = (await req.json()) as {
      handles?: string[];
      mapId?: string; // collective chart: read everyone woven in (members + guests)
      context?: RelContext;
      system?: ReadingSystem;
      question?: string; // ask the stars: reflect a specific decision through the chart(s)
    };
    const q = typeof question === 'string' ? question.trim().slice(0, 300) : '';
    if (!mapId && (!Array.isArray(handles) || handles.length === 0)) {
      return NextResponse.json({ error: 'handles or mapId required' }, { status: 400 });
    }
    if (!SYSTEMS.includes(system)) {
      return NextResponse.json({ error: `unknown system '${system}'` }, { status: 400 });
    }
    if (system !== 'western' && (mapId || (handles?.length ?? 0) > 1)) {
      return NextResponse.json(
        { error: 'Vedic/Mayan/Gene Keys/comparison readings are single-person for now.' },
        { status: 400 },
      );
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Readings are not configured yet (missing ANTHROPIC_API_KEY).' },
        { status: 503 },
      );
    }

    const sb = await serverClient();
    const me = await myFbid();
    let profiles: AstroProfile[];

    if (mapId) {
      // Collective chart: members render at the depth the caller is allowed
      // (standard+ to be interpreted); guests were supplied by the map owner
      // and carry no privacy holder, so they always read.
      const { data: map } = await sb.rpc('get_flow_map', { map_id: mapId });
      if (!map) {
        return NextResponse.json(
          { error: 'Collective chart not found (or you are not woven into it).' },
          { status: 404 },
        );
      }
      const memberHandles = ((map.members ?? []) as { handle: string | null }[])
        .map((m) => m.handle)
        .filter(Boolean) as string[];
      const lookups = await Promise.all(memberHandles.map(getProfileByHandle));
      const visible = lookups
        .filter((l): l is { status: 'ok'; profile: AstroProfile } => l.status === 'ok')
        .map((l) => l.profile);
      const readable: AstroProfile[] = [];
      for (const p of visible) {
        if (p.fbid === me || atLeast(await myLevelOn(p.fbid), 'standard')) {
          readable.push(p);
          if (p.fbid !== me) await logChartRead(p.fbid, 'synastry');
        }
      }
      const guests = ((map.guests ?? []) as any[]).map(
        (g): AstroProfile => ({
          fbid: `guest:${g.id}`,
          handle: g.display_name,
          displayName: g.display_name,
          avatarColor: g.avatar_color,
          visibility: 'specific',
          birth: { date: g.birth_date, time: null, tz: '', lat: 0, lng: 0, place: g.birth_place },
          chart: g.chart,
        }),
      );
      profiles = [...readable, ...guests];
      if (profiles.length < 2) {
        return NextResponse.json(
          { error: 'A collective reading needs at least two charts you can read here.' },
          { status: 400 },
        );
      }
    } else {
      // Privacy gate: every chart must be one the caller is allowed to see (RLS).
      const lookups = await Promise.all(handles!.map(getProfileByHandle));
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
      profiles = lookups.map((l) => (l as { profile: AstroProfile }).profile);

      // Depth gate: interpretation of someone ELSE's chart needs at least a
      // standard share; the deep traditions (vedic/mayan/genekeys/comparison)
      // need a deep or open-heart share. The owner always passes.
      for (const p of profiles) {
        if (p.fbid === me) continue;
        const level = await myLevelOn(p.fbid);
        const needed = system === 'western' ? 'standard' : 'deep';
        if (!atLeast(level, needed)) {
          return NextResponse.json(
            {
              error:
                system === 'western'
                  ? `@${p.handle} shares only the essentials with you — readings need a standard share.`
                  : `Deep-tradition readings of @${p.handle} need a deep or open-heart share.`,
            },
            { status: 403 },
          );
        }
        await logChartRead(p.fbid, profiles.length === 1 ? 'reading' : 'synastry');
      }
    }

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
      // Cached fact derivation: for your OWN chart this loads precomputed facts
      // from your private FBID memory (computing + storing once); for someone
      // else's chart it derives fresh without persisting. Either way the heavy
      // work happens at most once per chart, not on every reading.
      const bundle: ChartFacts =
        p.fbid === me && me ? await getOrBuildFacts(me, p.chart, p.birth.date) : buildFacts(p.chart, p.birth.date);

      const western = {
        name: firstName(p),
        bigThree: bigThree(p),
        placements: bundle.placements,
        natalAspects: bundle.aspects,
        elements: bundle.elements,
        modalities: bundle.modalities,
        ecosystemActivations: acgFor(p),
      };

      if (system === 'western') {
        facts = western;
        ask = `Write a "self" reading for ${firstName(p)}. Open with who they are at core (the big three), weave in the most defining placements and aspects (the gifts and the growth edges), note their elemental balance, and close with where in the FlowBond ecosystem their chart is most activated and what that suggests for retreat, building, or gathering.`;
      } else if (system === 'vedic') {
        facts = {
          name: firstName(p),
          vedic: bundle.vedic,
          vimshottari: bundle.vimshottari,
          westernBigThree: western.bigThree,
        };
        ask = `Write a Vedic (sidereal) reading for ${firstName(p)}. Ground it in the Moon's nakshatra and its lord, the Lagna, and the rashi placements; describe the karmic texture they carry and what chapter the Vimshottari dasha says they are living now. Mention the western big three only to orient, never to contradict.`;
        maxTokens = 900;
      } else if (system === 'mayan') {
        facts = {
          name: firstName(p),
          mayan: bundle.mayan,
        };
        ask = `Write a Mayan reading for ${firstName(p)} covering BOTH counts: the Traditional (GMT) day sign + tone as their ancestral face of the day, and the Dreamspell kin with its oracle (guide, analog, antipode, occult) as their galactic working team. Keep the two counts clearly distinct, then close with what carrying both says about how they move through time.`;
        maxTokens = 900;
      } else if (system === 'genekeys') {
        facts = {
          name: firstName(p),
          geneKeys: bundle.geneKeys,
        };
        ask = `Write a Gene Keys reading for ${firstName(p)} along the Activation Sequence: Life's Work, Evolution, Radiance, Purpose. For each sphere, name the shadow as the contracted pattern they will recognize, the gift as what unlocks, and the siddhi as the far star. Weave the profile lines into HOW they walk this path. Close with the single shadow→gift shift that would move everything else.`;
        maxTokens = 1000;
      } else {
        // comparison & unified: same person through all the lenses
        facts = {
          name: firstName(p),
          western: { bigThree: western.bigThree, defining: western.natalAspects.slice(0, 5) },
          vedic: bundle.vedic,
          vimshottari: bundle.vimshottari,
          mayan: bundle.mayan,
          geneKeys: bundle.geneKeys,
        };
        ask =
          system === 'unified'
            ? `Write a UNIFIED reading for ${firstName(p)}: weave the western chart, Vedic sidereal, the Mayan counts and Gene Keys into one clear resume of a few short paragraphs. Lead with what every lens agrees on about who they are — said once, strongly, in plain language — then what each tradition uniquely adds, and close with the single clearest thing this whole sky is asking of them right now.`
            : `Write a comparison reading for ${firstName(p)} across the four lenses they carry: western tropical (personality weather), Vedic sidereal (karmic ground), the Mayan counts (the face of their day), and Gene Keys (evolutionary arc). Name where the systems AGREE — that convergence is the loudest truth in the chart — and what each lens uniquely reveals that the others cannot see. Do not rank the systems.`;
        maxTokens = 1200;
      }
    } else if (profiles.length === 2) {
      const [a, b] = profiles;
      const pan = panorama(a.chart, b.chart, context);
      facts = {
        people: [firstName(a), firstName(b)],
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
      ask = `Write a ${context} reading for ${firstName(a)} and ${firstName(b)}. Explain the defining current between them, what genuinely flows and what creates friction in THIS context specifically, and end with what they can do to thrive together${context === 'coliving' ? ' under one roof' : context === 'business' ? ' as collaborators' : ''}.`;
    } else {
      // Collective reading (flow map): pairwise synastry matrix + best shared base.
      const pairs: { a: string; b: string; score: number; defining: string }[] = [];
      for (let i = 0; i < profiles.length; i++)
        for (let j = i + 1; j < profiles.length; j++) {
          const pan = panorama(profiles[i].chart, profiles[j].chart, context);
          pairs.push({
            a: firstName(profiles[i]),
            b: firstName(profiles[j]),
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
        group: profiles.map(firstName),
        context,
        groupFlowScore: groupScore,
        strongestBond: pairs.slice().sort((x, y) => y.score - x.score)[0],
        hardestBond: pairs.slice().sort((x, y) => x.score - y.score)[0],
        pairwise: pairs,
        bigThree: profiles.map(bigThree),
        bestSharedPlaces: bestPlaces,
      };
      ask = `Write a collective ${context} reading for this group (${profiles
        .map(firstName)
        .join(', ')}). Describe the group's overall dynamic, name the strongest bond and the one that needs the most care, and — using the astrocartography fit — recommend where this crew should base, build, or gather. This is for positioning a real ${
        context === 'business' ? 'project/partnership' : context === 'coliving' ? 'shared living space' : 'group'
      }.`;
      maxTokens = 1100;
    }

    // Ask the stars: the question rides inside the FACTS (data, not directive)
    // and the reading becomes a mirror for the decision — reflective, never
    // prescriptive, per the cached framework's question rules.
    if (q) {
      facts = { ...(facts as Record<string, unknown>), QUESTION: q };
      ask += ' They are holding the QUESTION included in the facts — let the whole reading revolve around it, reflecting it through the symbols per your question rules.';
      maxTokens = Math.max(maxTokens, 1000);
    }

    const reading = await channelFlowMe(facts, ask, maxTokens);
    // Grow the user's private memory (owner-only, best-effort) so readings stay
    // consistent over time. Only for your OWN self-reading; never for others.
    if (profiles.length === 1 && me && profiles[0].fbid === me) {
      await appendMemory(me, `reading:${system}`, q ? `Reflected the question: ${q}` : `Read their ${system} chart.`);
    }
    return NextResponse.json({ reading, model: MODEL });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'reading failed' }, { status: 500 });
  }
}
