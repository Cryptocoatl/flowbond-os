import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { RoomProvider, type RoomCtx, B } from './RoomContext';
import {
  ChapterOpening,
  ChapterSystem,
  ChapterSpine,
  ChapterValue,
  ChapterFlow,
  ChapterCompare,
  ChapterChain,
  ChapterPrecut,
  ChapterDanz,
  ChapterDanzProof,
  ChapterDanzFit,
  ChapterHearts,
  ChapterHeartRules,
  ChapterInventoryHead,
  ChapterInventoryLive,
  ChapterInventoryRest,
  ChapterPlanHead,
  ChapterPlan,
  ChapterNeedHead,
  ChapterNeedA,
  ChapterNeedB,
  ChapterMoney,
  ChapterDeal,
  ChapterRunningCost,
  ChapterNext,
} from './chapters';
import Finale from '@/export/Finale';
import PrintDoc from '@/export/PrintDoc';
import {
  gsap,
  ScrollTrigger,
  initSmoothScroll,
  destroySmoothScroll,
  prefersReducedMotion,
} from '@/lib/motion';

const DanceChain = lazy(() => import('@/chain/DanceChain'));

const CHAPTERS = [
  { id: 'opening', label: 'The proposal', accent: 'var(--gold)' },
  { id: 'system', label: 'Architecture', accent: 'var(--gold)' },
  { id: 'spine', label: 'Architecture', accent: 'var(--gold)' },
  { id: 'value', label: 'Architecture', accent: 'var(--azure)' },
  { id: 'flow', label: 'Member flow', accent: 'var(--azure)' },
  { id: 'compare', label: 'The mechanic', accent: 'var(--gold)' },
  { id: 'chain', label: 'The mechanic', accent: 'var(--gold)' },
  { id: 'precut', label: 'The mechanic', accent: 'var(--gold)' },
  { id: 'danz', label: 'Already running', accent: 'var(--azure)' },
  { id: 'danz-proof', label: 'Already running', accent: 'var(--rose)' },
  { id: 'danz-fit', label: 'Already running', accent: 'var(--azure)' },
  { id: 'hearts', label: 'The currency', accent: 'var(--rose)' },
  { id: 'heart-rules', label: 'The currency', accent: 'var(--sun)' },
  { id: 'inventory', label: 'Inventory', accent: 'var(--paper)' },
  { id: 'inventory-live', label: 'Inventory', accent: 'var(--paper)' },
  { id: 'inventory-rest', label: 'Inventory', accent: 'var(--paper)' },
  { id: 'plan', label: 'Delivery', accent: 'var(--violet)' },
  { id: 'plan-steps', label: 'Delivery', accent: 'var(--violet)' },
  { id: 'need', label: 'Your side', accent: 'var(--gold)' },
  { id: 'need-a', label: 'Your side', accent: 'var(--gold)' },
  { id: 'need-b', label: 'Your side', accent: 'var(--gold)' },
  { id: 'money', label: 'The model', accent: 'var(--sun)' },
  { id: 'deal', label: 'The deal', accent: 'var(--gold)' },
  { id: 'running-cost', label: 'The deal', accent: 'var(--sun)' },
  { id: 'next', label: 'Immediate', accent: 'var(--gold)' },
  { id: 'finale', label: "Let's dance", accent: 'var(--gold)' },
];

export default function ScrollRoom(
  props: RoomCtx & { slug: string; onChapter?: (id: string) => void },
) {
  const growth = useRef(prefersReducedMotion() ? 1 : 0);
  const quarantine = useRef(prefersReducedMotion() ? 1 : 0);
  const countRef = useRef<HTMLSpanElement>(null);
  const cutRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    initSmoothScroll();
    // Images and fonts land after first paint and change every pinned
    // chapter's height. Without this the whole film drifts out of sync.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const t = setTimeout(refresh, 900);
    return () => {
      window.removeEventListener('load', refresh);
      clearTimeout(t);
      destroySmoothScroll();
    };
  }, []);

  /* ---- progress rail + which chapter we are in --------------------- */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (barRef.current) gsap.set(barRef.current, { scaleX: p });

      const mid = window.innerHeight * 0.5;
      const secs = document.querySelectorAll<HTMLElement>('[data-chapter]');
      for (let i = secs.length - 1; i >= 0; i--) {
        const r = secs[i].getBoundingClientRect();
        if (r.top <= mid) {
          setActive((cur) => (cur === i ? cur : i));
          break;
        }
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    props.onChapter?.(CHAPTERS[active]?.id ?? 'opening');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // The counter is written straight to the DOM. Re-rendering React sixty
  // times a second to move a number is what costs the frame.
  const onCount = useCallback((honest: number, excluded: number) => {
    if (countRef.current) countRef.current.textContent = honest.toLocaleString('en-US');
    if (cutRef.current) {
      cutRef.current.textContent = excluded > 0 ? `−${excluded.toLocaleString('en-US')} excluded from ranking` : '';
    }
  }, []);

  const exportData = {
    roomTitle: '1 Million Women Dance × DANZ — Build Proposal',
    clientName: 'House of Tigris Media',
    blocks: [...props.blocks.values()].sort((a, b) => a.ordinal - b.ordinal),
    myMarks: props.myMarks,
    commentsByBlock: props.commentsByBlock,
  };

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop + 1, behavior: 'smooth' });
  };

  return (
    <RoomProvider value={props}>
      {/* ---- Persistent HUD ------------------------------------------ */}
      <div
        className="fixed left-0 top-0 z-50 h-[3px] w-full origin-left"
        style={{ background: CHAPTERS[active]?.accent ?? 'var(--gold)', transform: 'scaleX(0)' }}
        ref={barRef}
        aria-hidden="true"
      />

      <nav
        className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 px-3 py-2 md:bottom-5 md:px-4"
        style={{ background: 'rgb(11 11 12 / 0.85)', border: '1px solid var(--hair)', backdropFilter: 'blur(10px)' }}
        aria-label="Chapters"
      >
        <span className="t-mono shrink-0 whitespace-nowrap" style={{ color: CHAPTERS[active]?.accent }}>
          {String(active + 1).padStart(2, '0')}
          <span className="opacity-50">/{String(CHAPTERS.length).padStart(2, '0')}</span> ·{' '}
          {CHAPTERS[active]?.label}
        </span>

        {/* On a phone the ticks are too small to hit, so the bar carries it. */}
        <span className="relative h-[3px] w-24 shrink-0 md:hidden" style={{ background: 'rgb(255 255 255 / 0.2)' }}>
          <span
            className="absolute left-0 top-0 h-full transition-all duration-300"
            style={{
              width: `${((active + 1) / CHAPTERS.length) * 100}%`,
              background: CHAPTERS[active]?.accent,
            }}
          />
        </span>
        <span className="hidden items-center gap-[3px] md:flex">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => jump(c.id)}
              title={c.label}
              aria-label={`Go to ${c.label}`}
              aria-current={i === active}
              className="group h-4 w-5"
            >
              <span
                className="mt-1.5 block h-[3px] w-full transition-all duration-300 group-hover:h-[6px]"
                style={{ background: i === active ? c.accent : i < active ? 'rgb(255 255 255 / 0.45)' : 'rgb(255 255 255 / 0.16)' }}
              />
            </button>
          ))}
        </span>
      </nav>

      {/* ---- The film ------------------------------------------------- */}
      <main>
        <ChapterOpening />
        <ChapterSystem />
        <ChapterSpine />
        <ChapterValue />
        <ChapterFlow />
        <ChapterCompare />

        <ChapterChain growthRef={growth} quarantineRef={quarantine}>
          <Suspense fallback={null}>
            <DanceChain
              growthRef={growth}
              quarantineRef={quarantine}
              onCount={onCount}
              accent="var(--gold)"
              className="absolute inset-0 h-full w-full"
            />
          </Suspense>

          {/* The number sits dead centre-bottom, where the chain is sparsest,
              and never has a photograph moving behind it. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-10 text-center">
            <p
              className="t-display text-[clamp(3rem,12vw,10rem)] leading-[0.8] tabular-nums"
              style={{ color: 'var(--gold)' }}
            >
              <span ref={countRef}>0</span>
            </p>
            <p className="t-tag mt-2 text-white/85">women in the chain</p>
            <p ref={cutRef} className="t-mono mt-1" style={{ color: 'var(--rose)' }} />
          </div>

          <div
            className="absolute bottom-0 left-0 z-20 u-pad pb-6" style={{ maxWidth: 'min(94vw, 36rem)' }}
            data-in="chainCopy"
          >
            <B k="chain.world" accent="var(--gold)" anim={false} />
          </div>

          <div
            className="absolute right-0 top-0 z-20 u-pad pt-20" style={{ maxWidth: 'min(94vw, 34rem)' }}
            data-in="fraud"
          >
            <B k="chain.fraud" accent="var(--rose)" anim={false} />
          </div>
        </ChapterChain>

        <ChapterPrecut />
        <ChapterDanz />
        <ChapterDanzProof />
        <ChapterDanzFit />
        <ChapterHearts />
        <ChapterHeartRules />
        <ChapterInventoryHead />
        <ChapterInventoryLive />
        <ChapterInventoryRest />
        <ChapterPlanHead />
        <ChapterPlan />
        <ChapterNeedHead />
        <ChapterNeedA />
        <ChapterNeedB />
        <ChapterMoney />
        <ChapterDeal />
        <ChapterRunningCost />
        <ChapterNext />
        <Finale data={exportData} />
      </main>

      {/* Hidden on screen; this is what the browser prints. */}
      <div className="print-doc-host">
        <PrintDoc {...exportData} />
      </div>
    </RoomProvider>
  );
}
