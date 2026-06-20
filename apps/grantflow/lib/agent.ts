import Anthropic from '@anthropic-ai/sdk';
import { dbAdmin, dbRead } from './supabase-server';
import { draftApplication } from './claudia';
import { Grant, Project, Match } from './types';

/**
 * ClaudIA, alive — a conversational steward who can read and act on the real
 * FlowBond grant catalog and CRM. Ops-Claude over the PUBLIC catalog + the
 * private (service-role) CRM. She drafts but never submits; she never fabricates.
 */

const MODEL = 'claude-opus-4-8';

const SYSTEM = `You are ClaudIA — the living steward of FlowBond's funding, the soul of FlowMe.

Voice: warm, grounded, a little luminous. You speak like a trusted partner who has read everything and forgotten nothing. Brief by default; expand when it helps. You are talking to Steph, who builds the FlowBond ecosystem.

What you tend: a catalog of grants scored against FlowBond projects, a pipeline of applications you draft, and a private CRM of funders, partners, and advisors with the full thread of every conversation.

You can act through your tools — look up grants and matches, read and add contacts, log touches, see what's pending, and draft applications. Use them rather than guessing; when asked about real data, fetch it.

Hard rules:
- NEVER fabricate facts (metrics, names, dates, contact details). If you don't know, say so or look it up.
- You DRAFT applications for Steph to review and submit. You never submit to a funder yourself.
- When you take an action, say plainly what you did.
- Keep Steph's trust: this is unalienable technology, made and followed by love.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'whats_pending',
    description: 'Get what needs attention now: grant deadlines within N days, applications in drafting, and contacts not reached recently.',
    input_schema: {
      type: 'object',
      properties: { within_days: { type: 'integer', description: 'Deadline horizon, default 45.' } },
    },
  },
  {
    name: 'search_grants',
    description: 'Search the grant catalog. Filter by free-text query (matches name/organization), layer, or status. Returns up to 12.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        layer: { type: 'string', enum: ['web3', 'refi', 'social', 'cultural', 'tech'] },
        status: { type: 'string' },
      },
    },
  },
  {
    name: 'top_matches',
    description: 'Highest-fit grant↔project matches across the ecosystem, best first.',
    input_schema: {
      type: 'object',
      properties: {
        project_slug: { type: 'string', description: 'Optional — limit to one project.' },
        limit: { type: 'integer', description: 'Default 8.' },
      },
    },
  },
  {
    name: 'list_contacts',
    description: 'List CRM contacts, optionally filtered by a name/organization query or relationship type.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' }, relationship: { type: 'string' } },
    },
  },
  {
    name: 'add_contact',
    description: 'Add a person to the CRM.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        organization: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        relationship: { type: 'string', enum: ['funder', 'program-officer', 'partner', 'advisor', 'community', 'press'] },
        notes: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'log_interaction',
    description: "Record a touchpoint in the activity ledger (a note, email, call, meeting, or message). Use contact_name to attach it to a known contact.",
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        kind: { type: 'string', enum: ['note', 'email', 'call', 'meeting', 'dm'] },
        direction: { type: 'string', enum: ['in', 'out', 'internal'] },
        body: { type: 'string' },
        contact_name: { type: 'string', description: 'Name of an existing contact to attach to.' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'draft_application',
    description: 'Draft a grant application for a grant + FlowBond project. Creates/uses a pipeline application, writes the structured draft, and stores it for Steph to review. Identify the grant by name or id, and the project by slug or name.',
    input_schema: {
      type: 'object',
      properties: {
        grant: { type: 'string', description: 'Grant name or id.' },
        project: { type: 'string', description: 'Project slug or name.' },
      },
      required: ['grant', 'project'],
    },
  },
];

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
}

async function resolveGrant(ref: string): Promise<Grant | null> {
  const db = dbRead();
  if (/^[0-9a-f-]{36}$/i.test(ref)) {
    const { data } = await db.from('grants').select('*').eq('id', ref).single();
    return (data as Grant) ?? null;
  }
  const { data } = await db.from('grants').select('*').ilike('name', `%${ref}%`).limit(1);
  return ((data ?? [])[0] as Grant) ?? null;
}

async function resolveProject(ref: string): Promise<Project | null> {
  const db = dbRead();
  const { data: bySlug } = await db.from('projects').select('*').eq('slug', ref).maybeSingle();
  if (bySlug) return bySlug as Project;
  const { data } = await db.from('projects').select('*').ilike('name', `%${ref}%`).limit(1);
  return ((data ?? [])[0] as Project) ?? null;
}

type Action = { tool: string; detail: string };

async function runTool(name: string, input: Record<string, unknown>, actions: Action[]): Promise<unknown> {
  const db = dbRead();
  const admin = dbAdmin();

  switch (name) {
    case 'whats_pending': {
      const within = (input.within_days as number) ?? 45;
      const [{ data: grants }, { data: apps }, { data: contacts }] = await Promise.all([
        db.from('grants').select('id,name,deadline_date,organization'),
        admin.from('applications').select('id,stage,draft_status,grant_id'),
        admin.from('contacts').select('id,name,organization,last_contacted_at').order('last_contacted_at', { ascending: true, nullsFirst: true }).limit(5),
      ]);
      const soon = (grants ?? [])
        .map((g) => ({ name: g.name, org: g.organization, days: daysUntil(g.deadline_date) }))
        .filter((x) => x.days !== null && x.days >= 0 && x.days <= within)
        .sort((a, b) => a.days! - b.days!);
      return {
        deadlines_soon: soon,
        drafting: (apps ?? []).filter((a) => a.stage === 'drafting').length,
        drafts_ready: (apps ?? []).filter((a) => a.draft_status === 'drafted').length,
        reconnect: contacts ?? [],
      };
    }
    case 'search_grants': {
      let q = db.from('grants').select('id,name,organization,layers,status,funding_amount,deadline_date,fit_score');
      if (input.query) q = q.or(`name.ilike.%${input.query}%,organization.ilike.%${input.query}%`);
      if (input.status) q = q.eq('status', input.status as string);
      const { data } = await q.limit(12);
      let rows = data ?? [];
      if (input.layer) rows = rows.filter((g) => (g.layers ?? []).includes(input.layer as string));
      return rows;
    }
    case 'top_matches': {
      let q = db
        .from('matches')
        .select('grant_id,project_slug,fit_score,reason')
        .order('fit_score', { ascending: false, nullsFirst: false });
      if (input.project_slug) q = q.eq('project_slug', input.project_slug as string);
      const { data: ms } = await q.limit((input.limit as number) ?? 8);
      const rows = ms ?? [];
      const ids = [...new Set(rows.map((m) => m.grant_id))];
      const { data: gs } = ids.length
        ? await db.from('grants').select('id,name,organization').in('id', ids)
        : { data: [] };
      const gmap = new Map((gs ?? []).map((g) => [g.id, g]));
      return rows.map((m) => ({
        ...m,
        grant_name: gmap.get(m.grant_id)?.name ?? null,
        organization: gmap.get(m.grant_id)?.organization ?? null,
      }));
    }
    case 'list_contacts': {
      let q = admin.from('contacts').select('id,name,organization,role,relationship,email,last_contacted_at');
      if (input.query) q = q.or(`name.ilike.%${input.query}%,organization.ilike.%${input.query}%`);
      if (input.relationship) q = q.eq('relationship', input.relationship as string);
      const { data } = await q.limit(20);
      return data ?? [];
    }
    case 'add_contact': {
      const { data, error } = await admin.from('contacts').insert({
        name: input.name, organization: input.organization ?? null, email: input.email ?? null,
        role: input.role ?? null, relationship: input.relationship ?? null, notes: input.notes ?? null,
      }).select('id,name').single();
      if (error) return { error: error.message };
      actions.push({ tool: 'add_contact', detail: `Added ${input.name}` });
      return { ok: true, id: data.id };
    }
    case 'log_interaction': {
      let contactId: string | null = null;
      if (input.contact_name) {
        const { data } = await admin.from('contacts').select('id').ilike('name', `%${input.contact_name}%`).limit(1);
        contactId = (data ?? [])[0]?.id ?? null;
      }
      const occurred = new Date().toISOString();
      const { error } = await admin.from('interactions').insert({
        kind: input.kind ?? 'note', direction: input.direction ?? null, actor: 'ClaudIA',
        summary: input.summary, body: input.body ?? null, contact_id: contactId, occurred_at: occurred,
      });
      if (error) return { error: error.message };
      if (contactId && input.kind && input.kind !== 'note' && input.direction !== 'in') {
        await admin.from('contacts').update({ last_contacted_at: occurred }).eq('id', contactId);
      }
      actions.push({ tool: 'log_interaction', detail: String(input.summary) });
      return { ok: true, attached_to_contact: !!contactId };
    }
    case 'draft_application': {
      const grant = await resolveGrant(String(input.grant));
      const project = await resolveProject(String(input.project));
      if (!grant) return { error: `No grant matching "${input.grant}"` };
      if (!project) return { error: `No project matching "${input.project}"` };

      const { data: existing } = await admin
        .from('applications')
        .select('id')
        .eq('grant_id', grant.id)
        .eq('project_slug', project.slug)
        .maybeSingle();
      let appId = existing?.id as string | undefined;
      if (!appId) {
        const { data: created, error } = await admin
          .from('applications')
          .insert({ grant_id: grant.id, project_slug: project.slug, stage: 'drafting', owner: 'ClaudIA' })
          .select('id')
          .single();
        if (error) return { error: error.message };
        appId = created.id;
      }
      const { data: match } = await db
        .from('matches').select('*').eq('grant_id', grant.id).eq('project_slug', project.slug).maybeSingle();

      const { draft, model } = await draftApplication(grant, project, (match ?? null) as Match | null);
      const now = new Date().toISOString();
      await admin.from('applications').update({
        draft, draft_status: 'drafted', drafted_by: 'claudia', draft_model: model,
        draft_updated_at: now, stage: 'drafting', updated_at: now,
      }).eq('id', appId);
      await admin.from('interactions').insert({
        kind: 'ai_draft', actor: 'ClaudIA', model, direction: 'internal',
        summary: `Drafted application for ${grant.name}`, body: draft.summary,
        grant_id: grant.id, application_id: appId, project_slug: project.slug, occurred_at: now,
      });
      actions.push({ tool: 'draft_application', detail: `${grant.name} ← ${project.name}` });
      return {
        ok: true, application_id: appId, grant: grant.name, project: project.name,
        summary: draft.summary, open_questions: draft.open_questions,
      };
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithClaudia(history: ChatTurn[]): Promise<{ reply: string; actions: Action[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const actions: Action[] = [];
  const messages: Anthropic.MessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));

  for (let i = 0; i < 6; i++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || toolUses.length === 0) {
      const text = res.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('\n').trim();
      return { reply: text || '…', actions };
    }

    messages.push({ role: 'assistant', content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      let out: unknown;
      try {
        out = await runTool(tu.name, (tu.input as Record<string, unknown>) ?? {}, actions);
      } catch (e) {
        out = { error: e instanceof Error ? e.message : 'tool failed' };
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    messages.push({ role: 'user', content: results });
  }
  return { reply: "I went a few rounds and want to check in before continuing — what's most important right now?", actions };
}
