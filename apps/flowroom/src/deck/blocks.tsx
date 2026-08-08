import type {
  Block,
  CalloutBlock,
  CardBlock,
  CompareBlock,
  HeroBlock,
  NeedItemBlock,
  NextItemBlock,
  OptionBlock,
  ProseBlock,
  SectionHeadBlock,
  SiteMapBlock,
  StageBlock,
  StatBlock,
  Status,
  TableRowBlock,
  TimelineStepBlock,
} from '@/content/types';
import { parseEmphasis } from '@/lib/theme';

/**
 * Deck block renderers.
 *
 * `onColor` is threaded to every one of these rather than inferred, because
 * the single defect of the first build was text that could not be read
 * against what was behind it. On a solid colour panel everything goes ink
 * black; on ink or photography everything goes near-white. There is no third
 * case and no low-contrast grey for anything anyone has to read.
 */

interface Ctx {
  onColor: boolean;
  accent: string;
  /** The chapter is drawing the headline itself; render only lede + chips. */
  headless?: boolean;
}

const STATUS: Record<Status | 'neutral', { label: string; color: string; ink: boolean }> = {
  live: { label: 'Live', color: 'var(--gold)', ink: true },
  wire: { label: 'Wire', color: 'var(--azure)', ink: true },
  later: { label: 'Later', color: '#8A8A93', ink: false },
  neutral: { label: '', color: 'var(--paper)', ink: true },
};

export function Pill({ status, label, onColor }: { status: Status | 'neutral'; label?: string; onColor: boolean }) {
  const s = STATUS[status];
  return (
    <span
      className="t-tag inline-flex shrink-0 items-center gap-1.5 px-2.5 py-[3px]"
      style={
        onColor
          ? { background: 'var(--ink)', color: s.color }
          : { background: s.color, color: s.ink ? 'var(--ink)' : 'var(--paper)' }
      }
    >
      {label ?? s.label}
    </span>
  );
}

/** A solid slab. Never translucent — that is how the last version failed. */
function Slab({
  children,
  onColor,
  accent,
  className = '',
}: {
  children: React.ReactNode;
  onColor: boolean;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={`h-full p-6 md:p-7 ${className}`}
      style={{
        background: onColor ? 'var(--ink)' : 'var(--ink-2)',
        borderTop: accent ? `4px solid ${accent}` : `1px solid var(--hair)`,
        color: 'var(--paper)',
      }}
    >
      {children}
    </div>
  );
}

const Body = ({ children, onColor }: { children: React.ReactNode; onColor: boolean }) => (
  <p className="t-body" style={{ color: onColor ? 'rgb(0 0 0 / 0.86)' : 'rgb(255 255 255 / 0.93)' }}>
    {children}
  </p>
);

/* ------------------------------------------------------------------ */

function Hero({ b, ctx }: { b: HeroBlock; ctx: Ctx }) {
  return (
    <div className="max-w-[min(92vw,58rem)]">
      <p className="t-tag mb-5" style={{ color: ctx.accent }}>
        {b.eyebrow}
      </p>
      {!ctx.headless && (
        <h1 className="t-display mb-6 text-[clamp(2.6rem,7.4vw,6.6rem)]">
          {parseEmphasis(b.headline).map((r, i) =>
            r.em ? (
              <em key={i} className="not-italic" style={{ color: ctx.accent }}>
                {r.text}
              </em>
            ) : (
              <span key={i}>{r.text}</span>
            ),
          )}
        </h1>
      )}
      <div className="mb-7 max-w-[46rem]">
        <Body onColor={ctx.onColor}>{b.lede}</Body>
      </div>
      <div className="flex flex-wrap gap-2">
        {b.chips.map((c) => (
          <Pill key={c.label} status={c.status} label={c.label} onColor={ctx.onColor} />
        ))}
      </div>
    </div>
  );
}

function SectionHead({ b, ctx }: { b: SectionHeadBlock; ctx: Ctx }) {
  return (
    <div className="max-w-[52rem]">
      <div className="mb-4 flex items-center gap-4">
        <span className="t-display text-[clamp(2.2rem,4vw,3.4rem)]" style={{ color: ctx.accent }}>
          {b.index}
        </span>
        <span className="t-tag" style={{ color: ctx.onColor ? 'rgb(0 0 0 / 0.6)' : ctx.accent }}>
          {b.eyebrow}
        </span>
      </div>
      <h2 className="t-display mb-5 text-[clamp(2.2rem,5.6vw,4.6rem)]">{b.title}</h2>
      {b.dek && <Body onColor={ctx.onColor}>{b.dek}</Body>}
    </div>
  );
}

function Prose({ b, ctx }: { b: ProseBlock; ctx: Ctx }) {
  return (
    <div>
      {b.title && <h3 className="t-sub mb-3 text-[1.5rem]">{b.title}</h3>}
      {b.body.map((p, i) => (
        <div key={i} className="mb-3 last:mb-0">
          <Body onColor={ctx.onColor}>{p}</Body>
        </div>
      ))}
    </div>
  );
}

function Callout({ b, ctx }: { b: CalloutBlock; ctx: Ctx }) {
  const c = b.tone === 'warn' ? 'var(--rose)' : ctx.accent;
  return (
    <div
      className="p-7 md:p-9"
      style={{ background: ctx.onColor ? 'var(--ink)' : 'var(--ink-2)', borderLeft: `5px solid ${c}` }}
    >
      <h3 className="t-display mb-4 text-[clamp(1.35rem,2.4vh+0.9vw,2.4rem)]" style={{ color: c }}>
        {b.title}
      </h3>
      {b.body.map((p, i) => (
        <div key={i} className="mb-3 last:mb-0">
          <Body onColor={false}>{p}</Body>
        </div>
      ))}
    </div>
  );
}

function Card({ b, ctx }: { b: CardBlock; ctx: Ctx }) {
  return (
    <Slab onColor={ctx.onColor} accent={ctx.accent}>
      <h3 className="t-sub mb-3 text-[1.35rem]">{b.title}</h3>
      <Body onColor={false}>{b.body}</Body>
      {b.tech && (
        <p className="t-mono mt-5 border-t pt-4" style={{ borderColor: 'var(--hair)', color: ctx.accent }}>
          {b.tech}
        </p>
      )}
    </Slab>
  );
}

function Stage({ b, ctx }: { b: StageBlock; ctx: Ctx }) {
  return (
    /* Two columns, not three. Status labels are long and unpredictable, and
       pinning them to an auto-width third column pushed them straight out of
       the card. They wrap under the body now. */
    <div className="grid gap-x-5 gap-y-2 sm:grid-cols-[3.2rem_1fr]">
      <span
        className="t-display text-[clamp(1.8rem,4vh,2.6rem)] leading-none"
        style={{ color: ctx.accent }}
      >
        {b.n}
      </span>
      <div className="min-w-0">
        <h3 className="t-sub mb-2">{b.title}</h3>
        <Body onColor={ctx.onColor}>{b.body}</Body>
        <p className="t-mono mt-3" style={{ color: ctx.onColor ? 'rgb(0 0 0 / 0.62)' : ctx.accent }}>
          {b.rail}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {b.statuses.map((s) => (
            <Pill key={s.label} status={s.status} label={s.label} onColor={ctx.onColor} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Compare({ b, ctx }: { b: CompareBlock; ctx: Ctx }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="p-7 md:p-9" style={{ background: 'var(--ink-2)', border: '1px solid var(--hair)' }}>
        <h3 className="t-display mb-4 text-[clamp(1.6rem,3.2vw,2.5rem)]" style={{ color: '#8A8A93' }}>
          {b.left.title}
        </h3>
        <Body onColor={false}>{b.left.body}</Body>
        <p className="t-mono mt-5" style={{ color: '#8A8A93' }}>
          {b.left.note}
        </p>
      </div>
      <div className="p-7 md:p-9" style={{ background: ctx.accent, color: 'var(--ink)' }}>
        <h3 className="t-display mb-4 text-[clamp(1.6rem,3.2vw,2.5rem)]">{b.right.title}</h3>
        <p className="t-body" style={{ color: 'rgb(0 0 0 / 0.86)' }}>
          {b.right.body}
        </p>
        <p className="t-mono mt-5" style={{ color: 'rgb(0 0 0 / 0.7)' }}>
          {b.right.note}
        </p>
      </div>
    </div>
  );
}

function TableRow({ b, ctx }: { b: TableRowBlock; ctx: Ctx }) {
  return (
    <div
      className="grid items-baseline gap-x-6 gap-y-1 py-3 md:grid-cols-[15rem_1fr_5.5rem]"
      style={{ borderTop: `1px solid ${ctx.onColor ? 'var(--hair-ink)' : 'var(--hair)'}` }}
    >
      <span className="t-sub text-[1.05rem]">{b.system}</span>
      <span
        className="text-[0.95rem] leading-snug"
        style={{ color: ctx.onColor ? 'rgb(0 0 0 / 0.8)' : 'rgb(255 255 255 / 0.86)' }}
      >
        {b.does}
      </span>
      <span className="md:justify-self-end">
        <Pill status={b.status} onColor={ctx.onColor} />
      </span>
    </div>
  );
}

function TimelineStep({ b, ctx }: { b: TimelineStepBlock; ctx: Ctx }) {
  return (
    <div className="grid gap-x-5 gap-y-2 sm:grid-cols-[8rem_1fr]">
      <div className="min-w-0">
        <p className="t-sub text-[1.05rem]" style={{ color: ctx.accent }}>
          {b.when}
        </p>
        <p className="t-mono mt-1" style={{ color: ctx.onColor ? 'rgb(0 0 0 / 0.6)' : 'rgb(255 255 255 / 0.6)' }}>
          {b.dates}
        </p>
      </div>
      <div className="min-w-0">
        <h3 className="t-sub mb-2">{b.title}</h3>
        <Body onColor={ctx.onColor}>{b.body}</Body>
        <p
          className="mt-3 border-l-2 pl-3 text-[0.92rem]"
          style={{ borderColor: ctx.accent, color: ctx.onColor ? 'rgb(0 0 0 / 0.78)' : 'rgb(255 255 255 / 0.8)' }}
        >
          Ships: {b.ships}
        </p>
      </div>
    </div>
  );
}

function NeedItem({ b, ctx }: { b: NeedItemBlock; ctx: Ctx }) {
  return (
    <div
      className="py-4"
      style={{ borderTop: `1px solid ${ctx.onColor ? 'var(--hair-ink)' : 'var(--hair)'}` }}
    >
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-3">
        <span className="t-sub text-[1.2rem]">{b.label}</span>
        {b.due && (
          <span className="t-mono" style={{ color: ctx.accent }}>
            {new Date(b.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <Body onColor={ctx.onColor}>{b.detail}</Body>
    </div>
  );
}

function Stat({ b, ctx }: { b: StatBlock; ctx: Ctx }) {
  return (
    <Slab onColor={ctx.onColor} accent={ctx.accent}>
      <p
        className={`t-display mb-4 text-[clamp(2.8rem,6.5vw,4.8rem)] ${b.accent === 'rainbow' ? 'u-rainbow' : ''}`}
        style={b.accent === 'rainbow' ? undefined : { color: ctx.accent }}
      >
        {b.figure}
      </p>
      <p className="t-sub mb-3 text-[1.1rem]">{b.label}</p>
      <Body onColor={false}>{b.body}</Body>
    </Slab>
  );
}

function Option({ b, ctx }: { b: OptionBlock; ctx: Ctx }) {
  return (
    <Slab onColor={ctx.onColor} accent={ctx.accent}>
      <p className="t-display mb-4 text-[3rem] leading-none" style={{ color: ctx.accent }}>
        {b.letter}
      </p>
      <h3 className="t-sub mb-3 text-[1.35rem]">{b.title}</h3>
      <Body onColor={false}>{b.body}</Body>
    </Slab>
  );
}

function NextItem({ b, ctx }: { b: NextItemBlock; ctx: Ctx }) {
  return (
    <div
      className="grid gap-4 py-4 md:grid-cols-[3rem_1fr]"
      style={{ borderTop: `1px solid ${ctx.onColor ? 'var(--hair-ink)' : 'var(--hair)'}` }}
    >
      <span className="t-display text-[1.9rem] leading-none" style={{ color: ctx.accent }}>
        {b.n}
      </span>
      <div>
        <h3 className="t-sub mb-1.5 text-[1.2rem]">{b.title}</h3>
        <Body onColor={ctx.onColor}>{b.detail}</Body>
      </div>
    </div>
  );
}

function SiteMap({ b, ctx }: { b: SiteMapBlock; ctx: Ctx }) {
  // headless = the chapter is drawing the four tiles so it can choreograph
  // them; this renders only the spine underneath.
  if (ctx.headless) {
    return (
      <div className="p-6 md:p-7" style={{ background: 'var(--ink)' }}>
        <h3 className="t-display mb-3 text-[clamp(1.5rem,3vw,2.2rem)]" style={{ color: ctx.accent }}>
          {b.spine.title}
        </h3>
        <Body onColor={false}>{b.spine.body}</Body>
      </div>
    );
  }
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {b.sites.map((s) => (
          <div key={s.domain} className="p-5" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <p className="t-sub mb-2 text-[1.05rem]" style={{ color: ctx.accent }}>
              {s.domain}
            </p>
            <p className="text-[0.9rem] leading-snug" style={{ color: 'rgb(255 255 255 / 0.85)' }}>
              {s.role}
            </p>
          </div>
        ))}
      </div>

      {/* The spine. One bar under all four — the diagram is the argument. */}
      <div className="mt-3 h-1.5 w-full" style={{ background: 'var(--ink)' }} />
      <div className="mt-3 p-6 md:p-7" style={{ background: 'var(--ink)' }}>
        <h3 className="t-display mb-3 text-[clamp(1.5rem,3vw,2.2rem)]" style={{ color: ctx.accent }}>
          {b.spine.title}
        </h3>
        <Body onColor={false}>{b.spine.body}</Body>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function DeckBlock({ block, ctx }: { block: Block; ctx: Ctx }) {
  switch (block.kind) {
    case 'hero':
      return <Hero b={block} ctx={ctx} />;
    case 'section_head':
      return <SectionHead b={block} ctx={ctx} />;
    case 'prose':
      return <Prose b={block} ctx={ctx} />;
    case 'callout':
      return <Callout b={block} ctx={ctx} />;
    case 'site_map':
      return <SiteMap b={block} ctx={ctx} />;
    case 'card':
      return <Card b={block} ctx={ctx} />;
    case 'stage':
      return <Stage b={block} ctx={ctx} />;
    case 'compare':
      return <Compare b={block} ctx={ctx} />;
    case 'table_row':
      return <TableRow b={block} ctx={ctx} />;
    case 'timeline_step':
      return <TimelineStep b={block} ctx={ctx} />;
    case 'need_item':
      return <NeedItem b={block} ctx={ctx} />;
    case 'stat':
      return <Stat b={block} ctx={ctx} />;
    case 'option':
      return <Option b={block} ctx={ctx} />;
    case 'next_item':
      return <NextItem b={block} ctx={ctx} />;
    case 'world':
      return null; // the live chain owns this slide
    default:
      return null;
  }
}
