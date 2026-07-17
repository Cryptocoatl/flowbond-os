import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LANG_COOKIE } from '../../../lib/i18n/config';

// FlowMe dreams up fresh things AstralFlow could become. Given the app as it is
// today plus the dreams people have already posted, it proposes a few concrete,
// buildable ideas — each a title + one-line why. The user can turn any of them
// into a real dream on the wall with one tap. This is ideation only: it writes
// nothing, reads no one's chart, and never invents user data.
const MODEL = process.env.ASTROFLOW_FLOWME_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const LANG_DIRECTIVE: Record<string, string> = {
  es: 'IMPORTANT: Write every title and why ENTIRELY in warm, natural Latin American Spanish.',
};

const DREAMER = `You are FlowMe, dreaming up what AstralFlow could become next.

AstralFlow is a cosmic social app: people map their birth chart (Western, Vedic/Jyotish with
nakshatras + dashas, Mayan, Gene Keys), weave their chart with friends into "constellations",
read the synastry between them, and explore an astrocartography Atlas of their power lines across
the earth. FlowMe is the in-app guide and pocket astrologer. Readings are pattern/tendency, never
fixed fate. The soul of the product: make the cosmos feel personal, relational, and alive — a tool
for real connection, self-knowledge, and belonging.

Propose fresh, SPECIFIC, buildable ideas that deepen that soul — features, rituals, moments, or
social mechanics. Favor things that are astrologically real (transits, returns, synastry, timing),
relational (bring people together), and delightful. Avoid vague ("improve UX") and avoid anything
already obviously present. Each idea: a short evocative TITLE (max 8 words) and a ONE-sentence why
that a real person would feel excited by.

Return ONLY a JSON array, no prose, no markdown fences:
[{"title":"...","body":"..."}, ...]  — between 4 and 6 ideas.`;

export async function POST(req: NextRequest) {
  try {
    const { existing } = (await req.json().catch(() => ({}))) as {
      existing?: string[]; // titles already on the wall, so FlowMe doesn't repeat them
    };
    if (!process.env.ANTHROPIC_API_KEY)
      return NextResponse.json({ error: 'FlowMe is resting (not configured).' }, { status: 503 });

    const already = (Array.isArray(existing) ? existing : [])
      .filter((s) => typeof s === 'string')
      .slice(0, 40)
      .map((s) => s.slice(0, 120));
    const avoidBlock = already.length
      ? `Dreams already posted (do NOT repeat these; go somewhere new):\n- ${already.join('\n- ')}`
      : 'No dreams posted yet — open the space wide.';

    let langBlocks: { type: 'text'; text: string }[] = [];
    try {
      const lang = (await cookies()).get(LANG_COOKIE)?.value;
      const d = lang ? LANG_DIRECTIVE[lang] : undefined;
      if (d) langBlocks = [{ type: 'text', text: d }];
    } catch {
      /* default English */
    }

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
        temperature: 1,
        system: [
          { type: 'text', text: DREAMER, cache_control: { type: 'ephemeral', ttl: '1h' } },
          ...langBlocks,
        ],
        messages: [{ role: 'user', content: `${avoidBlock}\n\nDream up what AstralFlow could become next.` }],
      }),
    });
    if (!res.ok) throw new Error(`FlowMe ${res.status}`);
    const data = await res.json();
    const raw = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();

    // Parse the JSON array defensively (strip any accidental fences).
    let ideas: { title: string; body: string }[] = [];
    try {
      const jsonText = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      const start = jsonText.indexOf('[');
      const end = jsonText.lastIndexOf(']');
      const arr = JSON.parse(start >= 0 ? jsonText.slice(start, end + 1) : jsonText);
      if (Array.isArray(arr)) {
        ideas = arr
          .filter((x: any) => x && typeof x.title === 'string')
          .slice(0, 6)
          .map((x: any) => ({ title: String(x.title).slice(0, 140), body: String(x.body ?? '').slice(0, 400) }));
      }
    } catch {
      /* fall through to error below */
    }
    if (!ideas.length) return NextResponse.json({ error: 'FlowMe drew a blank — try again.' }, { status: 502 });
    return NextResponse.json({ ideas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'FlowMe stumbled' }, { status: 500 });
  }
}
