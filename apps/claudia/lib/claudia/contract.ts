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

// Talk-to-act: ClaudIA may propose ACTIONS she performs in the empire. She only
// proposes — the client executes them against the FBID-gated grant RPCs, so the
// database still enforces who-may-do-what (no privilege escalation via the LLM).
export const ActionSchema = z.object({
  type: z.enum(['connect_app', 'disconnect_app', 'grant', 'revoke', 'complete_task']),
  app: z.string().optional(),                                  // slug, for connect/disconnect/grant
  fbid: z.string().optional(),                                 // grantee, for grant
  page: z.string().nullable().optional(),                      // grant scope (null = whole site)
  role: z.enum(['viewer', 'editor', 'admin']).optional(),      // grant role
  grant_id: z.string().optional(),                             // for revoke
  task: z.string().optional(),                                 // words from the task title, for complete_task
});

export const ReplySchema = z.object({
  say: z.string().default(''),
  tasks: z.array(TaskSchema).default([]),
  care: z.string().default(''),
  actions: z.array(ActionSchema).default([]),
});

export type ClaudiaTask = z.infer<typeof TaskSchema>;
export type ClaudiaAction = z.infer<typeof ActionSchema>;
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
    actions: Array.isArray(o.actions)
      ? o.actions.map((a) => ActionSchema.safeParse(a)).flatMap((r) => (r.success ? [r.data] : []))
      : [],
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
  return r ?? { say: raw, tasks: [], care: '', actions: [] };
}
