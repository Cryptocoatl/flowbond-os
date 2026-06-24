// ClaudIA · meeting-notes digest contract. The synthesis relay returns ONE JSON
// object describing the meeting; this Zod-validates it with the same robust
// fence-strip → first-{…} → graceful-degrade fallback as the chat contract.

import { z } from 'zod';

export const ActionSchema = z.object({
  title: z.string().min(1),
  owner: z.string().default(''),        // who owns it ("" if unstated)
  venture: z.string().default('FlowBond'),
});

export const DigestSchema = z.object({
  title: z.string().default('Reunión'),
  summary: z.string().default(''),
  decisions: z.array(z.string()).default([]),
  actions: z.array(ActionSchema).default([]),
  questions: z.array(z.string()).default([]),   // open questions / unknowns
  highlights: z.array(z.string()).default([]),  // notable moments / quotes
  topics: z.array(z.string()).default([]),      // agenda topics covered
});

export type MeetingAction = z.infer<typeof ActionSchema>;
export type MeetingDigest = z.infer<typeof DigestSchema>;

export const EMPTY_DIGEST: MeetingDigest = {
  title: 'Reunión', summary: '', decisions: [], actions: [], questions: [], highlights: [], topics: [],
};

function coerce(raw: unknown): MeetingDigest {
  const parsed = DigestSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const o = (raw ?? {}) as Record<string, unknown>;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    title: typeof o.title === 'string' ? o.title : 'Reunión',
    summary: typeof o.summary === 'string' ? o.summary : '',
    decisions: strArr(o.decisions),
    actions: Array.isArray(o.actions)
      ? o.actions.map((a) => ActionSchema.safeParse(a)).flatMap((r) => (r.success ? [r.data] : []))
      : [],
    questions: strArr(o.questions),
    highlights: strArr(o.highlights),
    topics: strArr(o.topics),
  };
}

/** Parse the synthesis relay's raw text into a validated digest, never throwing. */
export function parseDigest(raw: string): MeetingDigest {
  let t = (raw || '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const tryJson = (s: string): MeetingDigest | null => {
    try { return coerce(JSON.parse(s)); } catch { return null; }
  };
  let r = tryJson(t);
  if (!r) {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a !== -1 && b > a) r = tryJson(t.slice(a, b + 1));
  }
  return r ?? { ...EMPTY_DIGEST, summary: raw };
}
