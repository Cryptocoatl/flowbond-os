import type { Block } from '@/content/types';
import type { BlockRow } from '@/lib/room';
import { MARK_LABELS, type MarkKey, type CommentRow } from './printTypes';

/**
 * The printable document.
 *
 * A pinned, scroll-scrubbed film cannot be printed — every chapter is one
 * viewport tall and half of it is a photograph. So the PDF is a separate,
 * purpose-built linear document that lives hidden in the DOM and only exists
 * when the page is printed. Black on white, no photography, real page breaks,
 * and her own responses printed next to the item they belong to.
 *
 * Using the browser's own print-to-PDF keeps this at zero dependencies and
 * zero server cost, and it renders her actual fonts.
 */

const SECTION_TITLES: Record<string, string> = {
  hero: '',
  system: '01 · Architecture',
  flow: '02 · The member flow',
  chain: '03 · The mechanic',
  danz: '04 · DANZ.NOW — already live',
  hearts: '05 · Dance Hearts',
  inventory: '06 · Honest inventory',
  plan: '07 · Twelve weeks',
  need: '08 · What we need from you',
  money: '09 · The model',
  deal: '10 · The deal',
  next: '11 · Seven days',
};

export default function PrintDoc({
  roomTitle,
  clientName,
  blocks,
  myMarks,
  commentsByBlock,
}: {
  roomTitle: string;
  clientName: string;
  blocks: BlockRow[];
  myMarks: Record<string, MarkKey>;
  commentsByBlock: Record<string, CommentRow[]>;
}) {
  let section = '';

  return (
    <div className="print-doc" aria-hidden="true">
      <header className="pd-cover">
        <p className="pd-kicker">1 Million Women Dance × DANZ</p>
        <h1>{roomTitle}</h1>
        <p className="pd-meta">
          Prepared for {clientName}
          <br />
          Steph Ferrera — Founder &amp; CEO, FlowBond · Technology lead
          <br />
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="pd-terms">
          <h2>Headline terms</h2>
          <ul>
            <li>
              <strong>10% equity in House of Tigris Media</strong> to FlowBond, for product
              development. FlowBond builds the platform — no fixed build fee, no hourly, no change
              orders on the product.
            </li>
            <li>
              <strong>Steph Ferrera is the technology lead</strong>, accountable for architecture,
              delivery and security.
            </li>
            <li>
              <strong>Running costs are papered separately</strong> — hosting, storage, transcode,
              generation credits, third-party services and FlowBond platform fees, invoiced against
              actual consumption.
            </li>
            <li>
              Those costs are met by <strong>flexible contracts</strong> — commissions,
              campaign-specific scopes, brand-partner activations — signed as they arise, so they
              stay off the raise.
            </li>
            <li>
              <strong>Apple and Google developer accounts are FlowBond&rsquo;s.</strong> House of
              Tigris does not need to open them; transferring the apps later is a console
              operation, not a resubmission.
            </li>
            <li>
              <strong>The gamified layer is already live</strong> at danz.now — floors with QR
              check-in, server-authoritative movement XP, real heart rate over Bluetooth, and an
              organiser console.
            </li>
            <li>Twelve weeks from 17 August 2026 to a public MVP in the first week of November.</li>
          </ul>
        </div>
      </header>

      {blocks.map((row) => {
        const b = row.payload as Block;
        const head = row.section_key !== section;
        if (head) section = row.section_key;
        const mark = myMarks[row.id];
        const thread = (commentsByBlock[row.id] ?? []).filter((c) => !c.deleted_at);

        return (
          <div key={row.id}>
            {head && SECTION_TITLES[section] && <h2 className="pd-section">{SECTION_TITLES[section]}</h2>}
            <div className="pd-block">
              <Body b={b} />
              {(mark || thread.length > 0) && (
                <div className="pd-response">
                  <strong>Response: {mark ? MARK_LABELS[mark] : 'commented'}</strong>
                  {thread.map((c) => (
                    <p key={c.id}>{c.body}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <footer className="pd-foot">
        1 Million Women Dance × DANZ · Private — not indexed, not shared.
      </footer>
    </div>
  );
}

function Body({ b }: { b: Block }) {
  switch (b.kind) {
    case 'hero':
      return (
        <>
          <p className="pd-kicker">{b.eyebrow}</p>
          <h2>{b.headline.replace(/_/g, '')}</h2>
          <p>{b.lede}</p>
        </>
      );
    case 'section_head':
      return (
        <>
          <h3>{b.title}</h3>
          {b.dek && <p>{b.dek}</p>}
        </>
      );
    case 'prose':
      return (
        <>
          {b.title && <h4>{b.title}</h4>}
          {b.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </>
      );
    case 'callout':
      return (
        <div className="pd-callout">
          <h4>{b.title}</h4>
          {b.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      );
    case 'card':
      return (
        <>
          <h4>{b.title}</h4>
          <p>{b.body}</p>
          {b.tech && <p className="pd-tech">{b.tech}</p>}
        </>
      );
    case 'stage':
      return (
        <>
          <h4>
            {b.n}. {b.title}
          </h4>
          <p>{b.body}</p>
          <p className="pd-tech">{b.rail}</p>
        </>
      );
    case 'compare':
      return (
        <>
          <h4>{b.left.title}</h4>
          <p>{b.left.body}</p>
          <h4>{b.right.title}</h4>
          <p>{b.right.body}</p>
        </>
      );
    case 'table_row':
      return (
        <p className="pd-row">
          <strong>{b.system}</strong> — {b.does} <em>({b.status})</em>
        </p>
      );
    case 'timeline_step':
      return (
        <>
          <h4>
            {b.when} ({b.dates}) — {b.title}
          </h4>
          <p>{b.body}</p>
          <p className="pd-tech">Ships: {b.ships}</p>
        </>
      );
    case 'need_item':
      return (
        <p className="pd-row">
          <strong>{b.label}</strong> — {b.detail}
          {b.due && <em> (due {new Date(b.due).toLocaleDateString('en-GB')})</em>}
        </p>
      );
    case 'stat':
      return (
        <>
          <h3 className="pd-figure">{b.figure}</h3>
          <h4>{b.label}</h4>
          <p>{b.body}</p>
        </>
      );
    case 'option':
      return (
        <>
          <h4>
            Option {b.letter}: {b.title}
          </h4>
          <p>{b.body}</p>
        </>
      );
    case 'next_item':
      return (
        <p className="pd-row">
          <strong>
            {b.n}. {b.title}
          </strong>{' '}
          — {b.detail}
        </p>
      );
    case 'site_map':
      return (
        <>
          <ul>
            {b.sites.map((s) => (
              <li key={s.domain}>
                <strong>{s.domain}</strong> — {s.role}
              </li>
            ))}
          </ul>
          <h4>{b.spine.title}</h4>
          <p>{b.spine.body}</p>
        </>
      );
    default:
      return null;
  }
}
