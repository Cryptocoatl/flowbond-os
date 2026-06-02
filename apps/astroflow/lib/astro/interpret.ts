import type { Aspect, Chart, RelContext, SynastryResult } from './types';
import { synastry, natalAspects, REL_CONTEXTS } from './aspects';

/** Planet roles, reframed per relationship context. */
export const PR: Record<string, Record<string, string>> = {
  Sun: { core: 'identity & vitality', romance: 'pride & spark', friendship: 'way of shining', coliving: 'rhythm & pace', business: 'vision & leadership' },
  Moon: { core: 'emotions & needs', romance: 'emotional intimacy & safety', friendship: 'nurturing style', coliving: 'daily moods & comfort', business: 'gut instinct & morale' },
  Mercury: { core: 'mind & communication', romance: 'talk & flirtation', friendship: 'banter & mental rapport', coliving: 'everyday coordination', business: 'information flow & strategy' },
  Venus: { core: 'love & values', romance: 'attraction, affection & taste', friendship: 'shared enjoyment & warmth', coliving: 'harmony, beauty & comfort', business: 'money-taste, diplomacy & deals' },
  Mars: { core: 'drive & desire', romance: 'passion & physical chemistry', friendship: 'shared activity & play', coliving: 'handling of conflict & chores', business: 'drive & execution' },
  Jupiter: { core: 'growth & faith', romance: 'shared adventure & optimism', friendship: 'fun, generosity & big plans', coliving: 'philosophy of home', business: 'growth & opportunity' },
  Saturn: { core: 'structure & duty', romance: 'commitment & longevity', friendship: 'reliability over time', coliving: 'responsibility & boundaries', business: 'discipline & accountability' },
  Uranus: { core: 'freedom & change', romance: 'excitement & unpredictability', friendship: 'unconventional spark', coliving: 'need for independence', business: 'innovation & disruption' },
  Neptune: { core: 'dreams & ideals', romance: 'romance & idealization', friendship: 'shared dreams & compassion', coliving: 'shared vision (or blurred lines)', business: 'vision (and its blur)' },
  Pluto: { core: 'power & transformation', romance: 'intensity & depth', friendship: 'loyalty & depth', coliving: 'power dynamics at home', business: 'power, control & deep change' },
  Asc: { core: 'outward self', romance: 'physical chemistry & first impression', friendship: 'instant click', coliving: 'daily style', business: 'presence & first impressions' },
  MC: { core: 'public path', romance: 'shared direction in life', friendship: 'mutual ambitions', coliving: 'long-term goals', business: 'shared mission & reputation' },
};

export const SIGN_KEY: Record<string, string> = {
  Aries: 'boldly & directly', Taurus: 'steadily & sensually', Gemini: 'curiously & flexibly',
  Cancer: 'protectively & emotionally', Leo: 'proudly & expressively', Virgo: 'precisely & practically',
  Libra: 'harmoniously & relationally', Scorpio: 'intensely & deeply', Sagittarius: 'freely & expansively',
  Capricorn: 'seriously & ambitiously', Aquarius: 'unconventionally & independently', Pisces: 'dreamily & compassionately',
};
export const HOUSE_KEY: Record<number, string> = {
  1: 'self & identity', 2: 'money & values', 3: 'mind & siblings', 4: 'home & roots',
  5: 'creativity & romance', 6: 'work & health', 7: 'partnership', 8: 'intimacy & transformation',
  9: 'belief & travel', 10: 'career & reputation', 11: 'community & hopes', 12: 'the inner & hidden',
};

const ADVICE: Record<string, Record<string, string>> = {
  Saturn: { romance: "Don't read caution as coldness \u2014 build trust in steady steps.", friendship: 'Reliability is the glue; just keep showing up.', coliving: 'Set clear responsibilities and respect boundaries.', business: "Lock in roles, structure & accountability early \u2014 it's your make-or-break." },
  Pluto: { any: 'Choose transparency over control; watch for quiet power struggles.' },
  Mars: { romance: 'Let passion include directness \u2014 name friction before it simmers.', friendship: 'Keep competition playful.', coliving: 'Agree on a calm way to handle conflict and chores.', business: "Point the drive at a shared target so it doesn't turn on each other." },
  Moon: { any: "Make room for each other's moods; don't take reactivity personally." },
  Mercury: { any: 'Slow down and confirm you actually mean the same thing.' },
  Sun: { any: 'Two strong centers \u2014 take turns leading and give each other the stage.' },
  Uranus: { any: 'Build in freedom and surprise; routine will chafe.' },
  Neptune: { any: 'Keep expectations explicit \u2014 love the real person, not the ideal.' },
  Venus: { any: 'Talk openly about values and what each of you actually enjoys.' },
  Jupiter: { any: "Keep each other honest so optimism doesn't overshoot." },
};
export const adv = (pl: string, ctx: RelContext) =>
  ADVICE[pl]?.[ctx] ?? ADVICE[pl]?.any ?? 'Stay curious about the difference instead of trying to erase it.';

export const roleOf = (p: string, ctx: string) => PR[p]?.[ctx] ?? PR[p]?.core ?? p;

export function connWord(type: string, harmony: number): string {
  if (type === 'trine') return 'flows easily with';
  if (type === 'sextile') return 'finds opportunity with';
  if (type === 'conjunction') return harmony > 0 ? 'merges beautifully with' : 'fuses intensely with';
  if (type === 'square') return 'rubs against';
  if (type === 'opposition') return 'pulls opposite';
  return 'awkwardly meets';
}

export function interpretAspect(x: Aspect, ctx: RelContext): string {
  return `${x.p1} ${x.glyph} ${x.p2} — your ${roleOf(x.p1, ctx)} ${connWord(x.type, x.harmony)} their ${roleOf(x.p2, ctx)}`;
}

export function bandWord(v: number): string {
  return v >= 68 ? 'have a naturally easy flow'
    : v >= 55 ? 'have real chemistry that rewards a little effort'
    : v >= 45 ? 'are a genuine mix of ease and friction'
    : 'are a growth pairing that asks for conscious work';
}

export interface Panorama {
  context: RelContext;
  score: number;
  headline: string;
  flows: { aspect: Aspect; text: string }[];
  friction: { aspect: Aspect; text: string }[];
  advice: string;
}

/** The deep, context-specific read for a pair. */
export function panorama(a: Chart, b: Chart, ctx: RelContext): Panorama {
  const sy = synastry(a, b, ctx);
  const harm = sy.aspects.filter((x) => x.harmony > 0).sort((p, q) => q.contrib - p.contrib);
  const chal = sy.aspects.filter((x) => x.harmony < 0).sort((p, q) => p.contrib - q.contrib);
  const topH = harm[0];
  let headline = `In ${ctx}, you two ${bandWord(sy.score)} (${sy.score}).`;
  if (topH) headline += ` The current that defines it is ${topH.p1}–${topH.p2}: your ${roleOf(topH.p1, ctx)} ${connWord(topH.type, topH.harmony)} their ${roleOf(topH.p2, ctx)}.`;
  const order = ['Saturn', 'Pluto', 'Mars', 'Moon', 'Sun', 'Mercury', 'Uranus', 'Neptune', 'Venus', 'Jupiter'];
  const pick = order.find((pl) => chal.some((x) => x.p1 === pl || x.p2 === pl));
  return {
    context: ctx, score: sy.score, headline,
    flows: harm.slice(0, 5).map((x) => ({ aspect: x, text: interpretAspect(x, ctx) })),
    friction: chal.slice(0, 5).map((x) => ({ aspect: x, text: interpretAspect(x, ctx) })),
    advice: pick ? adv(pick, ctx) : 'Little to actively manage here \u2014 mostly just keep showing up.',
  };
}

/** All four panoramas at once — the full relationship spread. */
export function allPanoramas(a: Chart, b: Chart): Record<RelContext, Panorama> {
  return Object.fromEntries(REL_CONTEXTS.map((c) => [c, panorama(a, b, c)])) as Record<RelContext, Panorama>;
}

/** Plain-language per-person summary (planet-by-planet). */
export function personLines(c: Chart): { planet: string; line: string }[] {
  return Object.entries(c.bodies).map(([k, o]) => ({
    planet: k,
    line: `${k} in ${o.sign}${o.house ? ` (H${o.house} · ${HOUSE_KEY[o.house]})` : ''} — ${PR[k].core}, expressed ${SIGN_KEY[o.sign]}`,
  }));
}
