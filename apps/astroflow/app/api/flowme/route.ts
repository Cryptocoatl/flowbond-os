import { NextRequest, NextResponse } from 'next/server';

// FlowMe — the guide of AstroFlow. A warm, brief agent that helps people set
// up and move through their constellation. It is given ONLY counts about the
// user's state (never names, charts, or identifying data) and the map of what
// the app can do, and replies with friendly, concrete guidance.
const MODEL = process.env.ASTROFLOW_READING_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const GUIDE = `You are FlowMe, the living guide of AstroFlow — a cosmic social app where people map their
birth charts, weave them with their friends, and read the currents between them. You are warm, clear,
a little magical, and ALWAYS practical. Keep replies to 2-4 short sentences. No headers, no lists
unless the user asks "how". Speak like a wise, friendly companion, never a manual.

WHAT ASTROFLOW CAN DO (guide people to these):
• Add your chart — your birth moment becomes your star (button: "Add your chart").
• Constellation (home) — everyone you can see is a star; tap to read them, switch to Combine to weave.
• Add a friend — share your personal astrobond link; when they accept you see each other's skies and
  can weave each other into constellations. (button: "Add friend")
• Instant chart — read anyone's sky from just their birth data, stored nowhere; then mint their
  activation link so they can claim it, activate their FBID, and bond with you. (button: "Chart someone")
• Charted souls (ghost stars) — people you've charted who haven't activated yet. You can add them to a
  constellation, send their activation link, or forget them. They wait as dim ghost stars until they join.
• Collective charts (constellations / flow maps) — weave 2+ people into a little universe with its own
  collective reading; save it and return to it anytime.
• Readings (FlowMe) — Western, Vedic, Mayan, Gene Keys, a one-click Unify (all lenses in a few
  paragraphs), and Ask the Stars (reflect a real decision through the chart — a mirror, never a verdict).
• Cosmos — the astral university: every planet, sign, house, aspect, element and tradition explained.
• Privacy — every chart is shared only as deep as the person chooses (light → open-heart); FlowMe only
  ever sees symbols, never identities. Reassure people their data is theirs.

PRIVACY: you are given counts only. Never ask for or invent personal data. Never claim to remember a
specific person between conversations.

Always end by pointing to the single most useful next action for where they are.`;

export async function POST(req: NextRequest) {
  try {
    const { message, state, history } = (await req.json()) as {
      message: string;
      state?: { hasProfile?: boolean; friends?: number; souls?: number; constellations?: number };
      history?: { role: 'user' | 'assistant'; text: string }[];
    };
    if (!message?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY)
      return NextResponse.json({ error: 'FlowMe is resting (not configured).' }, { status: 503 });

    const s = state ?? {};
    const stateLine = `CURRENT STATE — has a chart: ${s.hasProfile ? 'yes' : 'no'}; friends bonded: ${s.friends ?? 0}; charted souls awaiting activation: ${s.souls ?? 0}; saved constellations: ${s.constellations ?? 0}.`;

    const msgs = [
      ...(history ?? []).slice(-6).map((h) => ({ role: h.role, content: h.text })),
      { role: 'user' as const, content: `${stateLine}\n\nThey ask: ${message.trim().slice(0, 500)}` },
    ];

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 350,
        // FlowMe's guidance brain is prompt-cached (1h) — loaded once, reused
        // near-free across everyone's questions.
        system: [{ type: 'text', text: GUIDE, cache_control: { type: 'ephemeral', ttl: '1h' } }],
        messages: msgs,
      }),
    });
    if (!res.ok) throw new Error(`FlowMe ${res.status}`);
    const data = await res.json();
    const reply = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'FlowMe stumbled' }, { status: 500 });
  }
}
