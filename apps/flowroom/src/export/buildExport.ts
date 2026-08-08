import type { Block, MarkKey } from '@/content/types';
import type { BlockRow, CommentRow } from '@/lib/room';
import { MARK_LABELS } from '@/lib/marks';

/**
 * The takeaway.
 *
 * Two jobs, one source of truth:
 *   1. a document she can read, print, or save as PDF
 *   2. a file she can drop straight into her own AI, so it can answer
 *      questions about this proposal and help her fill in whatever her side
 *      needs filled in — without her re-typing any of it
 *
 * The second one is the reason this is Markdown rather than a PDF blob. An
 * assistant can read Markdown perfectly and a PDF badly, and everything her
 * AI needs — the terms, the dates, the owners, what she already marked — is
 * plain text with headings.
 */

export interface ExportInput {
  roomTitle: string;
  clientName: string;
  blocks: BlockRow[];
  myMarks: Record<string, MarkKey>;
  commentsByBlock: Record<string, CommentRow[]>;
}

const SECTION_TITLES: Record<string, string> = {
  hero: 'The thesis',
  system: '01 · Architecture — four brands, one account',
  flow: '02 · The member flow',
  chain: '03 · The mechanic — why the chain is a graph',
  danz: '04 · DANZ.NOW — the gamified layer, already live',
  hearts: '05 · Dance Hearts',
  inventory: '06 · Honest inventory',
  plan: '07 · Twelve weeks to a public MVP',
  need: '08 · What we need from you',
  money: '09 · The model',
  deal: '10 · The deal',
  next: '11 · Seven days, seven things',
};

/** Everything a block says, as prose. Kind-aware so nothing is lost. */
function blockToMarkdown(b: Block): string[] {
  const out: string[] = [];
  switch (b.kind) {
    case 'hero':
      out.push(`> ${b.eyebrow}`, '', `## ${b.headline.replace(/_/g, '')}`, '', b.lede, '');
      out.push(b.chips.map((c) => `- ${c.label} _(${c.status})_`).join('\n'));
      break;
    case 'section_head':
      out.push(`### ${b.title}`, '', `_${b.eyebrow}_`);
      if (b.dek) out.push('', b.dek);
      break;
    case 'prose':
      if (b.title) out.push(`**${b.title}**`, '');
      out.push(b.body.join('\n\n'));
      break;
    case 'callout':
      out.push(`**${b.title}**`, '', b.body.join('\n\n'));
      break;
    case 'card':
      out.push(`**${b.title}** — ${b.body}`);
      if (b.tech) out.push('', `\`${b.tech}\``);
      break;
    case 'stage':
      out.push(`**${b.n}. ${b.title}**`, '', b.body, '', `Rail: ${b.rail}`);
      out.push('', b.statuses.map((s) => `${s.label} (${s.status})`).join(' · '));
      break;
    case 'compare':
      out.push(
        `**${b.left.title}** — ${b.left.body} _(${b.left.note})_`,
        '',
        `**${b.right.title}** — ${b.right.body} _(${b.right.note})_`,
      );
      break;
    case 'table_row':
      out.push(`| ${b.system} | ${b.does} | ${b.status} |`);
      break;
    case 'timeline_step':
      out.push(`**${b.when} (${b.dates}) — ${b.title}**`, '', b.body, '', `_Ships: ${b.ships}_`);
      break;
    case 'need_item':
      out.push(`**${b.label}** — ${b.detail}${b.due ? ` _(due ${b.due})_` : ''}`);
      break;
    case 'stat':
      out.push(`**${b.figure} — ${b.label}**`, '', b.body);
      break;
    case 'option':
      out.push(`**Option ${b.letter}: ${b.title}** — ${b.body}`);
      break;
    case 'next_item':
      out.push(`**${b.n}. ${b.title}** — ${b.detail}`);
      break;
    case 'site_map':
      out.push(b.sites.map((s) => `- **${s.domain}** — ${s.role}`).join('\n'));
      out.push('', `**${b.spine.title}** — ${b.spine.body}`);
      break;
    case 'world':
      out.push(`**${b.title}** — ${b.body}`);
      break;
  }
  return out;
}

/** Human title for a block, used in the response summary. */
export function blockTitle(b: Block): string {
  switch (b.kind) {
    case 'hero':
      return b.headline.replace(/_/g, '');
    case 'section_head':
      return b.title;
    case 'table_row':
      return b.system;
    case 'need_item':
      return b.label;
    case 'timeline_step':
      return `${b.when} — ${b.title}`;
    case 'option':
      return `Option ${b.letter} — ${b.title}`;
    case 'stat':
      return `${b.figure} — ${b.label}`;
    case 'stage':
      return `${b.n} ${b.title}`;
    case 'compare':
      return `${b.left.title} vs ${b.right.title}`;
    case 'site_map':
      return b.spine.title;
    case 'prose':
      return b.title ?? b.body[0]?.slice(0, 60) ?? 'Note';
    default:
      return (b as { title?: string }).title ?? 'Block';
  }
}

/**
 * The AI-ready brief. Leads with an instruction block so that pasting the
 * file into an assistant is enough — she does not have to explain what it is
 * or what she wants done with it.
 */
export function buildAiBrief(input: ExportInput): string {
  const { roomTitle, clientName, blocks, myMarks, commentsByBlock } = input;
  const today = new Date().toISOString().slice(0, 10);

  const L: string[] = [
    `# ${roomTitle}`,
    '',
    `**Prepared for:** ${clientName}`,
    `**Prepared by:** Steph Ferrera — Founder & CEO, FlowBond · Technology lead for 1 Million Women Dance`,
    `**Exported:** ${today}`,
    '',
    '---',
    '',
    '## How to use this file',
    '',
    'You are reading a complete build proposal that has been exported for an AI assistant.',
    'Everything below is the full text of the proposal, plus any responses that were marked',
    'against individual items inside the room.',
    '',
    'Useful things to ask for:',
    '',
    '- *"Summarise what I still have to decide, with dates."*',
    '- *"Draft my answers to the four Dance Hearts rules."*',
    '- *"Fill in the participant terms brief for my lawyer using this."*',
    '- *"What did I disagree with, and what happens to the timeline if I change it?"*',
    '- *"Write the running-cost schedule referenced in section 10."*',
    '- *"Turn section 08 into a checklist with owners and due dates."*',
    '',
    'Dates are ISO (YYYY-MM-DD). Owners are `steph` (FlowBond), `vandana` (House of Tigris)',
    'or `shared`. Status values are `live` (running in production today), `wire` (existing',
    'systems to connect) and `later` (deliberately out of the MVP).',
    '',
    '---',
    '',
    '## Headline terms',
    '',
    '- **10% equity in House of Tigris Media** to FlowBond, for product development.',
    '- FlowBond builds the whole platform. No fixed build fee, no hourly, no change orders on the product.',
    '- **Steph Ferrera is the technology lead** — accountable for architecture, delivery and security.',
    '- **Running costs are papered separately**: hosting, storage, transcode, generation credits,',
    '  third-party services and FlowBond platform fees, invoiced against actual consumption.',
    '- Those running costs are met by **flexible contracts** — commissions, campaign-specific scopes,',
    '  brand-partner activations — signed as they arise, so they stay off the raise.',
    '- **Apple and Google developer accounts are FlowBond\'s**, so House of Tigris does not need to open',
    '  them. Transferring the apps later is a console operation, not a resubmission.',
    '- The gamified layer (**DANZ.NOW**) is already live at danz.now: floors with QR check-in,',
    '  server-authoritative movement XP, real heart rate over Bluetooth, and an organiser console.',
    '- Twelve weeks from 17 Aug 2026 to a public MVP the first week of November.',
    '',
    '---',
    '',
  ];

  /* ---- the proposal, in order ---- */
  let section = '';
  for (const row of blocks) {
    if (row.section_key !== section) {
      section = row.section_key;
      L.push('', `## ${SECTION_TITLES[section] ?? section}`, '');
    }
    L.push(...blockToMarkdown(row.payload as Block));

    const mark = myMarks[row.id];
    const thread = (commentsByBlock[row.id] ?? []).filter((c) => !c.deleted_at);
    if (mark || thread.length) {
      L.push('', `> **Response:** ${mark ? MARK_LABELS[mark] : 'commented'}`);
      for (const c of thread) L.push(`> ${c.body.replace(/\n/g, ' ')}`);
    }
    L.push('');
  }

  /* ---- what she still owes, pulled forward ---- */
  const open = blocks.filter(
    (b) => (b.payload as Block).kind === 'need_item' && !myMarks[b.id],
  );
  if (open.length) {
    L.push('', '---', '', '## Still open on your side', '');
    for (const b of open) {
      const p = b.payload as Block & { due?: string; owner?: string };
      L.push(`- [ ] ${blockTitle(b.payload as Block)}${p.due ? ` — due ${p.due}` : ''}${p.owner ? ` (${p.owner})` : ''}`);
    }
  }

  L.push(
    '',
    '---',
    '',
    '_1 Million Women Dance × DANZ. Private — not indexed, not shared._',
    '',
  );

  return L.join('\n');
}

export function download(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
