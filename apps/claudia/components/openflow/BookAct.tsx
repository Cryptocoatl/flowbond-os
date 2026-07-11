'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Book, Chapter, Product, SubChapter } from '@/lib/openflow/book';
import { logOpenflow } from '@/lib/openflow/analytics';

const ESSENCE: Record<number, string> = {
  1: 'Why one backbone can carry a whole regenerative economy.',
  2: 'The disciplined foundation everything else stands on.',
  3: 'Twenty-five products, one spine — the living catalog.',
  4: 'What runs, where it runs today, and what moves.',
  5: 'How we build: strategy to shipped, with almost no friction.',
  6: 'What joining forces unlocks — efficiency, capability, ecosystem.',
  7: 'Structure, a 90-day pilot, and the questions that matter.',
};

const GUIDE: Record<number, string> = {
  1: 'This is the map few have seen whole. Take your time — I’ll walk beside you.',
  2: 'One identity, one database, one discipline. Everything above rests on this.',
  3: 'Every node here is live or in motion. Tap any of them — the golden seed is where it all began.',
  4: 'This is where your servers change everything.',
  5: 'Low friction is the feature: swapping a hosted API for yours is a config change, not a rewrite.',
  6: 'Free marginal inference doesn’t just cut cost — it changes what we dare to run.',
  7: 'The ask is simple: start clean, prove it in ninety days.',
};

/* ── progress constellation nav ─────────────────────────────────────── */
function ProgressNav({
  current,
  maxVisited,
  onJump,
}: {
  current: number;
  maxVisited: number;
  onJump: (n: number) => void;
}) {
  return (
    <nav className="of-booknav" aria-label="Book parts">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <Fragment key={n}>
          {n > 1 && <div className={`of-thread${n <= maxVisited ? ' filled' : ''}`} />}
          <button
            className={`of-node${n === current ? ' active' : ''}${n <= maxVisited ? ' visited' : ''}`}
            onClick={() => onJump(n)}
            aria-label={`Part ${n}`}
            aria-current={n === current ? 'step' : undefined}
          >
            <span>{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n - 1]}</span>
          </button>
        </Fragment>
      ))}
    </nav>
  );
}

/* ── ClauDIA guide bubble ───────────────────────────────────────────── */
function Guide({ part }: { part: number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 9000);
    return () => clearTimeout(t);
  }, [part]);
  return (
    <div className="of-guide">
      {open && (
        <div className="of-guide-bubble" role="status">
          <button className="x" aria-label="Dismiss" onClick={() => setOpen(false)}>
            ×
          </button>
          {GUIDE[part]}
        </div>
      )}
      <button
        className="of-guide-sigil"
        aria-label="ClauDIA"
        onClick={() => setOpen((o) => !o)}
        title="ClauDIA"
      />
    </div>
  );
}

/* ── scroll reveals (IntersectionObserver, never blocks scroll) ─────── */
function useReveals(ref: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll(':scope .of-prose > *'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    els.forEach((el) => el.classList.add('io-reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('io-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ── Part III: interactive product constellation ────────────────────── */
function CatalogConstellation({ subs }: { subs: SubChapter[] }) {
  const [mode, setMode] = useState<'constellation' | 'list'>('constellation');
  const [openCard, setOpenCard] = useState<{ product?: Product; sub?: SubChapter } | null>(null);

  return (
    <div>
      <div className="of-toggle" role="tablist" aria-label="Catalog view">
        <button className={mode === 'constellation' ? 'on' : ''} onClick={() => setMode('constellation')} role="tab" aria-selected={mode === 'constellation'}>
          Constellation
        </button>
        <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')} role="tab" aria-selected={mode === 'list'}>
          Read as list
        </button>
      </div>

      {mode === 'list' ? (
        <div className="of-prose">
          {subs.map((s) => (
            <section key={s.letter}>
              <h3>
                {s.letter}. {s.title}
              </h3>
              <div dangerouslySetInnerHTML={{ __html: s.html }} />
            </section>
          ))}
        </div>
      ) : (
        <div className="of-clusters">
          {subs.map((s) =>
            s.letter === 'I' ? (
              <div className="of-cluster" key={s.letter} style={{ borderColor: 'rgba(201,162,39,0.5)' }}>
                <h4>
                  <span className="letter"><span>{s.letter}</span></span>
                  {s.title}
                </h4>
                <div className="of-nodes">
                  <button className="of-prodnode of-prodnode--seed" onClick={() => setOpenCard({ sub: s })}>
                    ✦ TulumCoin — the origin node
                  </button>
                </div>
              </div>
            ) : (
              <div className="of-cluster" key={s.letter}>
                <h4>
                  <span className="letter"><span>{s.letter}</span></span>
                  {s.title}
                </h4>
                <div className="of-nodes">
                  {s.products.map((p) => (
                    <button key={p.name} className="of-prodnode" onClick={() => setOpenCard({ product: p })}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {openCard && (
        <div className="of-prodcard" role="dialog" aria-modal="false" aria-label={openCard.product?.name ?? openCard.sub?.title}>
          <button className="close" aria-label="Close" onClick={() => setOpenCard(null)}>
            ×
          </button>
          {openCard.product ? (
            <>
              <h5>{openCard.product.name}</h5>
              <span className="status">{openCard.product.status}</span>
              <p>{openCard.product.what}</p>
            </>
          ) : openCard.sub ? (
            <>
              <h5>
                {openCard.sub.letter}. {openCard.sub.title}
              </h5>
              <span className="status">The origin node</span>
              <div className="of-prose" style={{ fontSize: 14.5 }} dangerouslySetInnerHTML={{ __html: openCard.sub.html }} />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── one chapter (title moment → content) ───────────────────────────── */
function ChapterView({ chapter, onContinue, isLast }: { chapter: Chapter; onContinue: () => void; isLast: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useReveals(bodyRef, [chapter.num]);

  return (
    <div className="of-bookmain" ref={bodyRef}>
      <header className="of-parttitle">
        <div className={`of-motif of-motif-${chapter.num}`} aria-hidden="true" />
        <span className="roman">Part {chapter.roman}</span>
        <h2 className="of-display">{chapter.title}</h2>
        <p className="essence">{ESSENCE[chapter.num]}</p>
      </header>

      {chapter.num === 3 && chapter.subs ? (
        <>
          {chapter.html.trim() && <article className="of-prose" dangerouslySetInnerHTML={{ __html: chapter.html }} />}
          <CatalogConstellation subs={chapter.subs} />
        </>
      ) : (
        <article className="of-prose" dangerouslySetInnerHTML={{ __html: chapter.html }} />
      )}

      <div className="of-partend">
        <button className="of-btn" onClick={onContinue}>
          {isLast ? 'Receive the Gift' : `Continue — Part ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][chapter.num]}`}
        </button>
      </div>
    </div>
  );
}

/* ── the act ────────────────────────────────────────────────────────── */
export default function BookAct({
  book,
  part,
  onPartChange,
  onFinished,
}: {
  book: Book;
  part: number;
  onPartChange: (n: number) => void;
  onFinished: () => void;
}) {
  const [maxVisited, setMaxVisited] = useState(part);
  const actRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMaxVisited((m) => Math.max(m, part));
    logOpenflow('chapter_viewed', { part });
    actRef.current?.scrollTo({ top: 0 });
  }, [part]);

  const chapter = useMemo(() => book.chapters.find((c) => c.num === part) ?? book.chapters[0], [book, part]);

  const continueFrom = useCallback(() => {
    if (part >= 7) onFinished();
    else onPartChange(part + 1);
  }, [part, onPartChange, onFinished]);

  return (
    <div className="of-act of-book" ref={actRef}>
      <ProgressNav current={part} maxVisited={maxVisited} onJump={onPartChange} />
      <ChapterView chapter={chapter} onContinue={continueFrom} isLast={part >= 7} />
      <Guide part={part} />
    </div>
  );
}
