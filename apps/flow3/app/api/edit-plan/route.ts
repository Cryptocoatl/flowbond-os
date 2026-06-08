import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@flowbond/ai';
import { clamp, GRADES, ASPECTS, type EditState } from '@/lib/grade';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// The "editor in the seat": reads the user's intent + their actual clips and
// returns a concrete edit recipe the studio applies for real. Claude only
// chooses *parameters* — every value is clamped server-side before it ships.
const SYSTEM = `You are the lead editor inside FlowStudio, an AI video editor.
The user has dropped their own footage (videos + photos) and tells you, in plain
language, the cut and look they want. You translate that into a precise edit recipe.

Respond with ONLY valid JSON, no prose, in this exact shape:
{
  "aspect": "16:9" | "9:16" | "1:1" | "2.39:1" | "4:5",
  "grade": "none" | "cinematic" | "warm" | "cool" | "noir" | "vivid" | "vintage",
  "brightness": number,   // 0.5..1.5, 1 = neutral
  "contrast": number,     // 0.5..1.6, 1 = neutral
  "saturation": number,   // 0..2, 1 = neutral
  "temperature": number,  // -100 (cool) .. 100 (warm)
  "vignette": number,     // 0..1
  "grain": number,        // 0..1
  "letterbox": boolean,
  "transition": "cut" | "crossfade" | "dip",
  "order": number[],      // clip indices in the order they should play
  "note": string          // one short sentence to the user on what you did
}

Guidance: "cinematic"/"film"/"movie" -> grade cinematic, letterbox true, slight vignette.
"social"/"reel"/"tiktok"/"vertical" -> aspect 9:16. "warm"/"sunset"/"golden" -> warm.
"cold"/"moody"/"winter" -> cool. "black and white"/"noir" -> noir.
"punchy"/"vibrant" -> vivid. "retro"/"vintage"/"old" -> vintage.
"smooth" -> crossfade, "snappy"/"hard cuts" -> cut. Keep edits tasteful, never extreme.`;

interface Clip { type: 'video' | 'image'; name: string; duration?: number }

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body: { prompt?: string; clips?: Clip[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const prompt = body.prompt?.trim();
  const clips = Array.isArray(body.clips) ? body.clips.slice(0, 40) : [];
  if (!prompt) return NextResponse.json({ error: 'prompt_required' }, { status: 400 });

  const clipManifest = clips.length
    ? clips.map((c, i) => `[${i}] ${c.type} "${c.name}"${c.duration ? ` ${c.duration.toFixed(1)}s` : ''}`).join('\n')
    : '(no clips on the timeline yet)';

  let raw = '';
  try {
    const client = getAnthropicClient();
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: `My footage:\n${clipManifest}\n\nWhat I want:\n${prompt}` }],
    });
    const block = res.content[0];
    raw = block.type === 'text' ? block.text : '';
  } catch (e) {
    return NextResponse.json({ error: 'ai_unavailable', detail: String(e) }, { status: 503 });
  }

  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, '').trim());
  } catch {
    return NextResponse.json({ error: 'plan_parse_failed', raw }, { status: 502 });
  }

  // Clamp / validate everything before it touches the editor.
  const aspect = (plan.aspect as string) in ASPECTS ? (plan.aspect as EditState['aspect']) : '16:9';
  const grade = (plan.grade as string) in GRADES ? (plan.grade as EditState['grade']) : 'cinematic';
  const order = Array.isArray(plan.order)
    ? (plan.order as number[]).filter((n) => Number.isInteger(n) && n >= 0 && n < clips.length)
    : clips.map((_, i) => i);

  const safe = {
    aspect,
    grade,
    brightness: clamp(Number(plan.brightness), 0.5, 1.5),
    contrast: clamp(Number(plan.contrast), 0.5, 1.6),
    saturation: clamp(Number(plan.saturation), 0, 2),
    temperature: clamp(Number(plan.temperature), -100, 100),
    vignette: clamp(Number(plan.vignette), 0, 1),
    grain: clamp(Number(plan.grain), 0, 1),
    letterbox: Boolean(plan.letterbox),
    transition: ['cut', 'crossfade', 'dip'].includes(plan.transition as string) ? (plan.transition as EditState['transition']) : 'crossfade',
    order: order.length ? order : clips.map((_, i) => i),
    note: typeof plan.note === 'string' ? plan.note.slice(0, 200) : 'Applied your edit.',
  };

  return NextResponse.json({ plan: safe });
}
