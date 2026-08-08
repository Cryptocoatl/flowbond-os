import { useCallback, useState } from 'react';
import Stage, { Tab } from '@/scroll/Stage';
import { buildAiBrief, download, type ExportInput } from './buildExport';

/**
 * The last chapter. Two jobs: say the thing, and hand her everything.
 *
 * The AI brief is the one that matters. She lives in her assistant, and a PDF
 * is where information goes to be re-typed — so the primary button gives her
 * a Markdown file whose first page tells her AI what it is and what to do
 * with it. The PDF is there because some counsel still wants a PDF.
 */
export default function Finale({ data }: { data: ExportInput }) {
  const [copied, setCopied] = useState(false);

  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    // The whole room has been building to this. She rises out of the dark,
    // the nebula blooms behind her, and only then do the words and the
    // download arrive. This is the one place a title sequence belongs.
    tl.fromTo('[data-mark]', { scale: 0.78, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, ease: 'power2.out' }, 0)
      .to('[data-mark]', { scale: 1.07, ease: 'none' }, 0.3)
      .fromTo('[data-bloom]', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: 'power2.out' }, 0.04)
      .fromTo(
        stage.querySelectorAll('[data-line]'),
        { yPercent: 118 },
        { yPercent: 0, stagger: 0.13, ease: 'power3.out' },
        0.26,
      )
      .fromTo(
        stage.querySelectorAll('[data-act]'),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.09, ease: 'power3.out' },
        0.4,
      );
  }, []);

  const brief = () => buildAiBrief(data);

  return (
    <Stage id="finale" tab="Let's dance" accent="var(--gold)" beats={3.4} timeline={timeline} hold>
      {/* The cosmos she already stands in, extended to the full frame. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(90% 80% at 50% 46%, #1B0E33 0%, #100722 52%, var(--ink) 100%)' }}
      />
      <div
        data-bloom
        className="pointer-events-none absolute left-1/2 top-1/2 h-[118vmin] w-[118vmin] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(closest-side, rgb(162 75 255 / 0.42) 0%, rgb(255 79 207 / 0.16) 45%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      {/*
        The mark, with its background removed in the browser rather than in an
        editor: `screen` blending against a near-black ground drops every dark
        pixel to nothing, so she floats free of the square she was rendered in.
        Costs no re-encode and keeps the gold and the heart at full strength.
      */}
      <video
        data-mark
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{ width: 'min(112vmin, 56rem)', mixBlendMode: 'screen', filter: 'contrast(1.06) saturate(1.06)' }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/deck/mark-poster.webp"
        aria-label="1 Million Women Dance"
      >
        <source src="/deck/mark.mp4" type="video/mp4" />
        <source src="/deck/mark.webm" type="video/webm" />
      </video>

      <Tab label="Let's dance" accent="var(--gold)" />

      <div className="relative flex h-full flex-col justify-end u-pad pb-20">
        <p className="t-tag mb-6" style={{ color: 'var(--gold)' }} data-act>
          Take it with you
        </p>

        <h2 className="t-display mb-8 text-[clamp(2.4rem,7vw,6.4rem)] text-white">
          {["Let's make the", 'world dance.'].map((l, i) => (
            <span key={l} className="block overflow-hidden">
              <span className="block" data-line style={{ color: i === 1 ? 'var(--gold)' : undefined }}>
                {l}
              </span>
            </span>
          ))}
        </h2>

        <div className="mb-8 max-w-[44rem] p-6" style={{ background: 'rgb(13 7 22 / 0.92)', border: '1px solid var(--hair)' }} data-act>
          <p className="t-body">
            Everything in this room — the terms, the twelve weeks, the dates, the owners, and
            whatever you marked as you went — comes out in one file. Drop the brief straight into
            your assistant and it can answer questions on it, draft your side of the paperwork, and
            fill in the forms from what you already have.
          </p>
        </div>

        <div className="flex flex-wrap gap-3" data-act>
          <button
            type="button"
            onClick={() =>
              download('1mwd-danz-brief.md', brief(), 'text/markdown;charset=utf-8')
            }
            className="t-tag px-7 py-4 transition-opacity hover:opacity-85"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            ↓ Download for your AI (.md)
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(brief());
                setCopied(true);
                setTimeout(() => setCopied(false), 2400);
              } catch {
                download('1mwd-danz-brief.md', brief(), 'text/markdown;charset=utf-8');
              }
            }}
            className="t-tag px-7 py-4 transition-colors"
            style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}
          >
            {copied ? '✓ Copied — paste it in' : 'Copy to clipboard'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="t-tag px-7 py-4 transition-colors hover:border-white"
            style={{ border: '1px solid var(--hair)', color: '#fff' }}
          >
            ↓ PDF
          </button>
        </div>

        <p className="t-mono mt-7 text-white/60" data-act>
          Steph Ferrera · Founder &amp; CEO, FlowBond · Technology lead, 1 Million Women Dance
        </p>
      </div>
    </Stage>
  );
}
