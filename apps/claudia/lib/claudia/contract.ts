// The action contract (master spec §3 / wiring §2): ClaudIA returns ONE JSON
// object per turn — {say, tasks[], care}. This parser is Zod-validated with the
// same robust fallback proven in the validated demo (strip fences → first {…}
// block → degrade gracefully to {say: raw, tasks: [], care: ""}). Versioned here
// so every FlowBond surface speaks it identically.

import { z } from 'zod';

export const TaskSchema = z.object({
  title: z.string().min(1),
  venture: z.string().default('FlowBond'),
  ready: z.string().default(''),
});

export const ReplySchema = z.object({
  say: z.string().default(''),
  tasks: z.array(TaskSchema).default([]),
  care: z.string().default(''),
});

export type ClaudiaTask = z.infer<typeof TaskSchema>;
export type ClaudiaReply = z.infer<typeof ReplySchema>;

function coerce(raw: unknown, fallbackSay: string): ClaudiaReply {
  const parsed = ReplySchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Salvage whatever fields are usable.
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    say: typeof o.say === 'string' ? o.say : fallbackSay,
    tasks: Array.isArray(o.tasks)
      ? o.tasks.map((t) => TaskSchema.safeParse(t)).flatMap((r) => (r.success ? [r.data] : []))
      : [],
    care: typeof o.care === 'string' ? o.care : '',
  };
}

/** Parse ClaudIA's raw text into the validated contract, never throwing. */
export function parseReply(raw: string): ClaudiaReply {
  let t = (raw || '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const tryJson = (s: string): ClaudiaReply | null => {
    try {
      return coerce(JSON.parse(s), raw);
    } catch {
      return null;
    }
  };
  let r = tryJson(t);
  if (!r) {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a !== -1 && b > a) r = tryJson(t.slice(a, b + 1));
  }
  return r ?? { say: raw, tasks: [], care: '' };
}
