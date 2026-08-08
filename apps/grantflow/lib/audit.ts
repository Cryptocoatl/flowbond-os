import Anthropic from '@anthropic-ai/sdk';
import { AuditFinding, AuditRound, DraftSection, Grant, Match, Project } from './types';
import { wordCount } from './review';

/**
 * ClaudIA auditing a draft she (or Steph) wrote, one round at a time.
 *
 * Same ops-Claude path as lib/claudia.ts — server-side, over the PUBLIC catalog,
 * no secret custody. The auditor never edits the draft and never submits; it
 * returns a verdict and findings, and a human decides what to do with them.
 *
 * These tools are deliberately NOT registered in lib/agent.ts. The conversational
 * agent can talk about audits; it cannot reach submission.
 */

const MODEL = 'claude-opus-5';

export interface RoundVerdict {
  verdict: 'pass' | 'fail';
  notes: string;
  findings: AuditFinding[];
}

const FINDING_ITEM = {
  type: 'object' as const,
  properties: {
    severity: {
      type: 'string',
      enum: ['blocker', 'warning', 'note'],
      description: 'blocker = this round cannot pass while it stands.',
    },
    section_key: {
      type: 'string',
      description: 'The key of the section this finding is about, or empty if it spans the draft.',
    },
    claim: { type: 'string', description: 'The exact text at issue, quoted from the draft.' },
    issue: { type: 'string', description: 'What is wrong with it.' },
    suggestion: { type: 'string', description: 'The concrete fix. Never rewrite the draft yourself.' },
  },
  required: ['severity', 'section_key', 'claim', 'issue', 'suggestion'],
};

/** Round 2 additionally classifies each claim against its source. */
const ACCURACY_FINDING_ITEM = {
  ...FINDING_ITEM,
  properties: {
    ...FINDING_ITEM.properties,
    traceability: {
      type: 'string',
      enum: ['traceable', 'unverifiable', 'contradicted'],
      description:
        'traceable = supported by a named context field. unverifiable = plausible but nothing provided supports it. contradicted = the provided context says otherwise.',
    },
    source: {
      type: 'string',
      description: 'For traceable claims, the context field it came from (e.g. "project.description").',
    },
  },
  required: [...FINDING_ITEM.required, 'traceability'],
};

function verdictTool(roundKey: string, extra = false): Anthropic.Tool {
  return {
    name: 'submit_audit_verdict',
    description: `Submit the ${roundKey} audit verdict for this draft.`,
    input_schema: {
      type: 'object',
      properties: {
        verdict: {
          type: 'string',
          enum: ['pass', 'fail'],
          description: 'fail if any finding has severity "blocker". Otherwise pass.',
        },
        notes: {
          type: 'string',
          description:
            'Two or three sentences for Steph: what you checked, what changed since the last round if anything, and the single most important thing to fix.',
        },
        findings: {
          type: 'array',
          description: 'Every problem found. Empty array if the draft is clean on this round.',
          items: extra ? ACCURACY_FINDING_ITEM : FINDING_ITEM,
        },
      },
      required: ['verdict', 'notes', 'findings'],
    },
  };
}

const SHARED_RULES = `You are auditing, not rewriting. Never produce replacement prose for the draft — describe the fix and let Steph write it.
Be specific: quote the exact text at issue in "claim". A finding without a quote is not actionable.
Do not invent problems to look thorough. A clean draft passes.
Report every issue you find, including low-severity ones, and set severity honestly — a separate human pass decides what actually matters. Only mark severity "blocker" for something that genuinely should stop this draft from being called ready.`;

const ROUND_SYSTEM: Record<string, string> = {
  completeness: `You are ClaudIA, auditing a grant application draft for COMPLETENESS.

You are checking one thing: is anything missing? Every required section present and substantive, every question the funder actually asked answered rather than deflected, the budget ask stated as a real figure, no placeholder text left behind.

An empty or one-line answer to a substantive question is a blocker. A section that restates the question without answering it is a blocker. Facts parked in the draft's open questions are NOT missing content — that is the correct place for them, do not flag them here.

${SHARED_RULES}`,

  accuracy: `You are ClaudIA, auditing a grant application draft for ACCURACY. This is the round that protects Steph's credibility with funders, and it is the strictest one.

Go claim by claim through the draft. For every factual assertion — any metric, date, headcount, funding figure, launch, partnership, endorsement, or named person or organization — classify it:

- "traceable": a field in the provided context supports it. Name that field in "source".
- "unverifiable": it may well be true, but nothing you were given establishes it.
- "contradicted": the provided context says something different.

Every "unverifiable" claim asserted in the draft body is a BLOCKER, and every "contradicted" claim is a BLOCKER. The draft may only assert what its sources support. The correct home for a fact Steph has but ClaudIA was not given is the open-questions list, not the body — a claim moved there is resolved, not a finding.

Do not flag ordinary argumentation, ambition, or qualitative description as unverifiable. "We believe this approach will scale" is a position, not a factual claim. "We have 12,000 users" is a factual claim and needs a source.

List every claim you classified as unverifiable or contradicted as a finding. You may omit traceable claims from the findings list.

${SHARED_RULES}`,

  fit_tone: `You are ClaudIA, auditing a grant application draft for FIT and TONE.

Two questions. First: does this draft speak to what THIS funder said they care about, in their own framing — or is it a generic pitch that could have been sent to anyone? Lead-with-the-match is the standard; a fit rationale that never mentions anything specific to this grant is a blocker.

Second: is it in FlowBond voice? That means direct, concrete, and specific. No hype, no buzzword stacking, no breathless adjectives, no invented urgency. Never any language offering equity or ownership — FlowBond does not give equity away, and any such language is a blocker.

Length and format are the next round's job. Stay on fit and voice.

${SHARED_RULES}`,

  compliance: `You are ClaudIA, auditing a grant application draft for COMPLIANCE with the funder's own rules.

Mechanical checks against what the funder specified: word limits per section (the word count of each section is given to you — a section over its stated limit is a blocker), the required attachments, the stated application process and format, and the eligibility criteria.

If the grant's application process names a required element the draft does not address, that is a blocker. If an attachment marked required is not yet checked off, that is a blocker. If the deadline has already passed, say so plainly as a blocker.

Where the funder specified nothing, say so rather than inventing a requirement to test against.

${SHARED_RULES}`,
};

function buildPrompt(
  round: AuditRound,
  grant: Grant,
  project: Project,
  match: Match | null,
  sections: DraftSection[],
  openQuestions: string[],
  checklist: { label: string; required: boolean; done: boolean }[],
  history: { cycle: number; verdict: string; notes: string | null }[],
): string {
  const lines: string[] = [
    `# Round ${round.round_no}: ${round.label}`,
    round.description ?? '',
    '',
    '## Checklist for this round',
    ...round.checklist.map((c) => `- ${c}`),
    '',
    '# The grant',
    `Name: ${grant.name}`,
    `Funder: ${grant.organization ?? 'unknown'}`,
    `Funding amount: ${[grant.funding_amount, grant.currency].filter(Boolean).join(' ') || 'unspecified'}`,
    `Deadline: ${grant.deadline_date ?? grant.deadline ?? 'not specified'}`,
    `Eligibility: ${grant.eligibility_summary ?? 'not specified'}`,
    `Application process: ${grant.application_process ?? 'not specified'}`,
    grant.requirements?.length ? `Stated requirements:\n${grant.requirements.map((r) => `- ${r}`).join('\n')}` : '',
    grant.url ? `Source URL: ${grant.url}` : '',
    '',
    '# The applicant project (this is the ONLY source of truth about FlowBond)',
    `Name: ${project.name}`,
    project.tagline ? `Tagline: ${project.tagline}` : '',
    `Layers: ${(project.layers ?? []).join(', ') || 'unspecified'}`,
    `Description: ${project.description ?? project.tagline ?? 'no description provided'}`,
    project.url ? `URL: ${project.url}` : '',
    '',
    '# Recorded match reason',
    match?.reason ?? 'No match note recorded.',
    '',
    '# The draft, section by section',
  ];

  for (const s of sections) {
    const wc = wordCount(s.body);
    const limit = s.word_limit ? ` / limit ${s.word_limit}` : '';
    lines.push(
      '',
      `## [${s.key}] ${s.label}`,
      `(${wc} words${limit}${s.required ? ', required' : ', optional'})`,
      s.source_note ? `Source note from Steph: ${s.source_note}` : '',
      s.body.trim() || '(EMPTY)',
    );
  }

  if (openQuestions.length) {
    lines.push(
      '',
      '# Open questions (facts Steph still owes — correctly parked here, NOT findings)',
      ...openQuestions.map((q) => `- ${q}`),
    );
  }

  if (checklist.length) {
    lines.push(
      '',
      '# Attachment checklist',
      ...checklist.map((c) => `- [${c.done ? 'x' : ' '}] ${c.label}${c.required ? ' (required)' : ''}`),
    );
  }

  if (history.length) {
    lines.push(
      '',
      '# Previous verdicts on this round — check whether the concerns were addressed',
      ...history.map((h) => `- Cycle ${h.cycle}: ${h.verdict.toUpperCase()} — ${h.notes ?? 'no notes'}`),
    );
  }

  lines.push('', 'Audit the draft now and submit your verdict via the submit_audit_verdict tool.');
  return lines.filter((l) => l !== '').join('\n');
}

export async function runAuditRound(args: {
  round: AuditRound;
  grant: Grant;
  project: Project;
  match: Match | null;
  sections: DraftSection[];
  openQuestions: string[];
  checklist: { label: string; required: boolean; done: boolean }[];
  history: { cycle: number; verdict: string; notes: string | null }[];
}): Promise<{ result: RoundVerdict; model: string }> {
  const system = ROUND_SYSTEM[args.round.key];
  if (!system) throw new Error(`No audit prompt defined for round "${args.round.key}"`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    tools: [verdictTool(args.round.key, args.round.key === 'accuracy')],
    tool_choice: { type: 'tool', name: 'submit_audit_verdict' },
    messages: [
      {
        role: 'user',
        content: buildPrompt(
          args.round,
          args.grant,
          args.project,
          args.match,
          args.sections,
          args.openQuestions,
          args.checklist,
          args.history,
        ),
      },
    ],
  });

  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('ClaudIA did not return a structured audit verdict');
  }

  const raw = block.input as RoundVerdict;
  const findings = (raw.findings ?? []).map((f) => ({
    ...f,
    section_key: f.section_key ? f.section_key : null,
  }));

  // The model states the verdict, but a blocker is a blocker — don't let a
  // "pass" ride on top of one.
  const verdict = findings.some((f) => f.severity === 'blocker') ? 'fail' : raw.verdict;

  return { result: { verdict, notes: raw.notes ?? '', findings }, model: MODEL };
}
