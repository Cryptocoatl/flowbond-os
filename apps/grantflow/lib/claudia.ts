import Anthropic from '@anthropic-ai/sdk';
import { Grant, Project, Match } from './types';

/**
 * ClaudIA, the FlowBond steward, drafting a grant application.
 *
 * This is the ops-Claude path (server-side, source-aware, over the PUBLIC grant
 * catalog) — NOT ClaudIA's zero-knowledge relay. No secret custody is involved;
 * we draft from non-sensitive catalog data. See docs/CLAUDIA-GRANT-WRITER.md §2.
 */

const MODEL = 'claude-opus-4-8';

export interface Draft {
  summary: string;
  answers: { q: string; a: string }[];
  budget_ask: string;
  fit_rationale: string;
  open_questions: string[];
  sources_used: string[];
}

const DRAFT_TOOL: Anthropic.Tool = {
  name: 'submit_grant_draft',
  description: 'Submit the drafted grant application as structured fields.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-paragraph project pitch tuned to this funder.' },
      answers: {
        type: 'array',
        description: "Answers to the grant's actual questions (from its requirements / application process).",
        items: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'The question being answered.' },
            a: { type: 'string', description: 'The answer.' },
          },
          required: ['q', 'a'],
        },
      },
      budget_ask: { type: 'string', description: "The amount requested, matching the grant's funding amount/currency." },
      fit_rationale: { type: 'string', description: "Why this project fits this grant — lead with the match reason." },
      open_questions: {
        type: 'array',
        description: 'Facts ClaudIA could NOT fill from the provided context and that Steph must supply (real figures, traction, team bios). Never invent these.',
        items: { type: 'string' },
      },
      sources_used: {
        type: 'array',
        description: 'Which provided context fields informed the draft.',
        items: { type: 'string' },
      },
    },
    required: ['summary', 'answers', 'budget_ask', 'fit_rationale', 'open_questions', 'sources_used'],
  },
};

const SYSTEM = `You are ClaudIA, the steward of FlowBond, drafting a grant application on Steph's behalf.

You write clear, specific, fundable prose. You answer the grant's ACTUAL questions, not generic boilerplate.

Hard rules:
- NEVER fabricate facts. Do not invent metrics, traction numbers, dates, team bios, or partnerships. If a strong application would need a fact you were not given, put it in open_questions for Steph to fill — do not make it up.
- Ground every claim in the project and grant context provided.
- Lead the fit rationale with the given match reason.
- Match the budget ask to the grant's funding amount.
- This is a draft for Steph to review and submit herself. You never submit.`;

function buildPrompt(grant: Grant, project: Project, match: Match | null): string {
  const questions =
    grant.requirements && grant.requirements.length
      ? grant.requirements
      : [
          'What problem does this project solve?',
          'How does the project work?',
          'Why is this team positioned to deliver it?',
          'What will the grant funds be used for?',
          'What is the expected impact?',
        ];

  return [
    `# Grant`,
    `Name: ${grant.name}`,
    `Funder: ${grant.organization ?? 'unknown'}`,
    `Funding amount: ${grant.funding_amount ?? 'unspecified'} ${grant.currency ?? ''}`.trim(),
    `Eligibility: ${grant.eligibility_summary ?? 'not specified'}`,
    `Application process: ${grant.application_process ?? 'not specified'}`,
    grant.url ? `Source URL: ${grant.url}` : '',
    ``,
    `# Questions to answer (derive answers[] from these)`,
    ...questions.map((q) => `- ${q}`),
    ``,
    `# Applicant project`,
    `Name: ${project.name}`,
    project.tagline ? `Tagline: ${project.tagline}` : '',
    `Layers: ${(project.layers ?? []).join(', ') || 'unspecified'}`,
    `Description: ${project.description ?? project.tagline ?? 'no description provided'}`,
    project.url ? `URL: ${project.url}` : '',
    ``,
    `# Why this is a fit (lead fit_rationale with this)`,
    match?.reason ?? 'No match note provided — derive the fit from the project and grant above.',
    ``,
    `Draft the application now and submit it via the submit_grant_draft tool.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function draftApplication(
  grant: Grant,
  project: Project,
  match: Match | null,
): Promise<{ draft: Draft; model: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [DRAFT_TOOL],
    tool_choice: { type: 'tool', name: 'submit_grant_draft' },
    messages: [{ role: 'user', content: buildPrompt(grant, project, match) }],
  });

  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('ClaudIA did not return a structured draft');
  }
  return { draft: block.input as Draft, model: MODEL };
}
