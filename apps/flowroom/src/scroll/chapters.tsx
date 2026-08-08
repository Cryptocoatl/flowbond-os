import { useCallback } from 'react';
import Stage, { PhotoLayer, Tab } from './Stage';
import { B, usePayload } from './RoomContext';
import HeartSystem from './HeartSystem';
import FocusDeck from './FocusDeck';
import type { SiteMapBlock } from '@/content/types';


/**
 * The chapters.
 *
 * Every one of these is choreographed by hand rather than run through a
 * generic reveal, because "cinematic" is precisely the difference between a
 * timeline that was designed and one that was applied. What moves, when, and
 * in which direction is an argument about the content each time.
 *
 * Two rules hold across all of them:
 *   · the photograph moves, the type does not
 *   · body copy is on a solid slab or a ≥78% scrim, always
 */

const P = '/deck';
const GOLD = 'var(--gold)';
const AZURE = 'var(--azure)';
const ROSE = 'var(--rose)';
const VIOLET = 'var(--violet)';
const SUN = 'var(--sun)';

/** Shared helper: the photograph pulls back slowly across the whole chapter. */
const pullBack = (stage: HTMLElement, tl: gsap.core.Timeline, to = 1.0) => {
  const photo = stage.querySelector('[data-photo]');
  if (photo) tl.fromTo(photo, { scale: 1.18 }, { scale: to, ease: 'none' }, 0);
};

/* ==================================================================== */
/* 00 — OPENING                                                         */
/* ==================================================================== */

export function ChapterOpening() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    // The motif breathes in behind the words rather than performing in front
    // of them. Nothing here should feel like a title sequence — that is what
    // the last chapter is for.
    tl.fromTo('[data-hs-chords]', { opacity: 0 }, { opacity: 1, ease: 'none' }, 0)
      .fromTo('[data-hs-nodes] circle', { scale: 0, transformOrigin: 'center' }, { scale: 1, stagger: 0.006, ease: 'back.out(2)' }, 0.02)
      .fromTo(
        stage.querySelectorAll('[data-line]'),
        { yPercent: 116 },
        { yPercent: 0, stagger: 0.13, ease: 'power3.out' },
        0.22,
      )
      .fromTo('[data-in="hero"]', { opacity: 0, y: 26 }, { opacity: 1, y: 0, ease: 'power2.out' }, 0.42)
      .to('[data-cue]', { opacity: 0, ease: 'none' }, 0.5);
  }, []);

  return (
    <Stage id="opening" tab="One heart" accent={GOLD} beats={2.8} timeline={timeline} hold>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 68% 40%, #1E1038 0%, #130A24 48%, var(--ink) 100%)' }}
      />

      {/* Sits off to the side, low contrast, well clear of the type. */}
      <HeartSystem className="pointer-events-none absolute right-[-6%] top-1/2 h-[78vmin] w-[78vmin] -translate-y-1/2 opacity-70 lg:right-[4%]" />

      <Tab label="One heart" accent={GOLD} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="w-full" style={{ maxWidth: 'min(94%, 42rem)' }}>
          <h1 className="t-display mb-7 text-[clamp(2.2rem,6vw,5rem)] text-white">
            {["Let's make the world", 'dance in one heart.'].map((l, i) => (
              <span key={l} className="block overflow-hidden">
                <span className="block" data-line style={{ color: i === 1 ? GOLD : undefined }}>
                  {l}
                </span>
              </span>
            ))}
          </h1>
          <div data-in="hero">
            <B k="hero.thesis" accent={GOLD} anim={false} headless />
          </div>
        </div>
      </div>

      <p data-cue className="t-mono absolute bottom-7 left-1/2 -translate-x-1/2 text-white/70">
        Scroll ↓
      </p>
    </Stage>
  );
}

/* ==================================================================== */
/* 01 — FOUR BRANDS, ONE SPINE                                          */
/* ==================================================================== */

export function ChapterSystem() {
  const timeline = useCallback((_s: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo('[data-in="sysHead"]', { opacity: 0, y: 46 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0);
  }, []);

  return (
    <Stage id="system" tab="Architecture" accent={GOLD} beats={2.2} timeline={timeline} hold>
      <div className="absolute inset-0" style={{ background: GOLD }} />
      <Tab label="Architecture" accent="var(--ink)" />
      <div className="on-color relative flex h-full items-center u-pad">
        <div className="max-w-[46rem]" data-in="sysHead">
          <B k="system.head" accent="var(--ink)" onColor anim={false} />
        </div>
      </div>
    </Stage>
  );
}

/**
 * The four doors arrive separately, then one bar wipes underneath and joins
 * them. The tiles are drawn here so they can be choreographed; the block
 * renders headless so its own copy of them cannot duplicate.
 */
export function ChapterSpine() {
  const map = usePayload<SiteMapBlock>('system.map');

  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo(
      stage.querySelectorAll('[data-site]'),
      { yPercent: -120, opacity: 0 },
      { yPercent: 0, opacity: 1, stagger: 0.1, ease: 'power3.out' },
      0,
    )
      .fromTo('[data-spine]', { scaleX: 0 }, { scaleX: 1, ease: 'power2.inOut' }, 0.4)
      .fromTo('[data-in="spine"]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0.52);
  }, []);

  return (
    <Stage id="spine" tab="Architecture" accent={GOLD} beats={2.8} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="Architecture" accent={GOLD} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <p className="t-tag mb-5" style={{ color: GOLD }}>
          01 · Four front doors, one account
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(map?.sites ?? []).map((site) => (
            <div
              key={site.domain}
              data-site
              className="p-5"
              style={{ background: 'var(--ink-2)', border: '1px solid var(--hair)' }}
            >
              <p className="t-sub mb-2 text-[1.02rem]" style={{ color: GOLD }}>
                {site.domain}
              </p>
              <p className="text-[0.9rem] leading-snug text-white/85">{site.role}</p>
            </div>
          ))}
        </div>

        <div
          data-spine
          className="mt-3 h-2 w-full origin-left"
          style={{ background: `linear-gradient(90deg, var(--rose), var(--violet), var(--azure), var(--sun))` }}
          aria-hidden="true"
        />

        <div className="mt-4 max-w-[54rem]" data-in="spine">
          <B k="system.map" accent={GOLD} anim={false} headless />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 02 — WHAT IT BUYS YOU                                                */
/* ==================================================================== */

export function ChapterValue() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.04);
    tl.fromTo(
      stage.querySelectorAll('[data-card]'),
      { yPercent: 42, opacity: 0 },
      { yPercent: 0, opacity: 1, stagger: 0.14, ease: 'power3.out' },
      0.08,
    );
  }, []);

  return (
    <Stage id="value" tab="Architecture" accent={AZURE} beats={2.2} timeline={timeline} hold>
      <PhotoLayer src={`${P}/riyadh-night.webp`} position="center 55%" dim={0.76} scrim="full" />
      <Tab label="Architecture" accent={AZURE} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <p className="t-tag mb-4" style={{ color: AZURE }}>
          01 · What it buys you
        </p>
        <h2 className="t-display mb-9 max-w-[22ch] text-[clamp(2rem,5.2vw,4.2rem)] text-white">
          One account, three answers.
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <B tag="card" k="system.value_s2" accent={AZURE} className="[&>*]:h-full" />
          <B tag="card" k="system.value_investors" accent={AZURE} className="[&>*]:h-full" />
          <B tag="card" k="system.value_brands" accent={AZURE} className="[&>*]:h-full" />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 03 — THE FLOW · vertical scroll drives a horizontal rail             */
/* ==================================================================== */

export const ChapterFlow = () => (
  <FocusDeck
    id="flow"
    tab="Member flow"
    accent={AZURE}
    kicker="02 · The member flow"
    title="Five stages, and the rail under each one."
    photo={{ src: `${P}/ardah.webp`, position: 'center 30%', dim: 0.84 }}
    keys={[
      'flow.01_join',
      'flow.02_chain',
      'flow.03_hearts',
      'flow.04_discovery',
      'flow.05_monthly',
      'flow.autoclip',
    ]}
  />
);

/* ==================================================================== */
/* 04 — COUNTER VERSUS GRAPH                                            */
/* ==================================================================== */

export function ChapterCompare() {
  const timeline = useCallback((_stage: HTMLElement, tl: gsap.core.Timeline) => {
    // The counter side literally loses: it drains and recedes while the graph
    // side takes the screen. The layout makes the point before the copy does.
    tl.fromTo('[data-side="left"]', { xPercent: -8, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power2.out' }, 0)
      .fromTo('[data-side="right"]', { xPercent: 8, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power2.out' }, 0.08)
      .to('[data-side="left"]', { opacity: 0.35, scale: 0.965, ease: 'power2.inOut' }, 0.55)
      .to('[data-side="right"]', { scale: 1.03, ease: 'power2.inOut' }, 0.55);
  }, []);

  return (
    <Stage id="compare" tab="The mechanic" accent={GOLD} beats={2.8} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="The mechanic" accent={GOLD} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-7 max-w-[44rem]">
          <B k="chain.head" accent={GOLD} />
        </div>
        <div data-side="left" className="contents">
          <B k="chain.compare" accent={GOLD} />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 05 — THE CHAIN                                                       */
/* ==================================================================== */

export function ChapterChain({
  growthRef,
  quarantineRef,
  children,
}: {
  growthRef: React.MutableRefObject<number>;
  quarantineRef: React.MutableRefObject<number>;
  children: React.ReactNode;
}) {
  const timeline = useCallback(
    (stage: HTMLElement, tl: gsap.core.Timeline) => {
      pullBack(stage, tl, 1.0);
      // Scroll *is* the growth. One move out to a million across four beats,
      // then the quarantine on the fifth — the count drops in your hand.
      tl.to(growthRef, { current: 1, ease: 'none', duration: 0.62 }, 0)
        .fromTo('[data-in="chainCopy"]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out' }, 0.62)
        .to(quarantineRef, { current: 1, ease: 'power2.inOut', duration: 0.24 }, 0.7)
        .fromTo('[data-in="fraud"]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out' }, 0.74);
    },
    [growthRef, quarantineRef],
  );

  return (
    <Stage id="chain" tab="The mechanic" accent={GOLD} beats={6} timeline={timeline}>
      <PhotoLayer src={`${P}/spiral-chain.webp`} position="center 50%" dim={0.88} scrim="none" />
      <Tab label="The mechanic" accent={GOLD} />
      {children}
    </Stage>
  );
}

/* ==================================================================== */
/* 06 — PRE-CUT SOCKETS                                                 */
/* ==================================================================== */

export function ChapterPrecut() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo(
      stage.querySelectorAll('[data-card]'),
      { yPercent: 34, opacity: 0 },
      { yPercent: 0, opacity: 1, stagger: 0.13, ease: 'power3.out' },
      0.05,
    );
  }, []);

  return (
    <Stage id="precut" tab="The mechanic" accent={GOLD} beats={2} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="The mechanic" accent={GOLD} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <p className="t-tag mb-4" style={{ color: GOLD }}>
          03 · Sockets cut now, built later
        </p>
        <h2 className="t-display mb-9 max-w-[20ch] text-[clamp(2rem,5vw,4rem)] text-white">
          Three things we pre-cut.
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <B tag="card" k="chain.verified_tier" accent={GOLD} className="[&>*]:h-full" />
          <B tag="card" k="chain.referral_share" accent={GOLD} className="[&>*]:h-full" />
          <B tag="card" k="chain.trademark" accent={GOLD} className="[&>*]:h-full" />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 04 — DANZ.NOW · the layer that already exists                        */
/* ==================================================================== */

export function ChapterDanz() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.03);
    tl.fromTo('[data-in="danzHead"]', { opacity: 0, y: 44 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0)
      .fromTo(
        stage.querySelectorAll('[data-card]'),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.12, ease: 'power3.out' },
        0.24,
      );
  }, []);

  return (
    <Stage id="danz" tab="Already running" accent={AZURE} beats={3} timeline={timeline} hold>
      <PhotoLayer src={`${P}/drummers.webp`} position="center 40%" dim={0.8} scrim="full" />
      <Tab label="Already running" accent={AZURE} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-8 max-w-[48rem]" data-in="danzHead">
          <B k="danz.head" accent={AZURE} anim={false} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <B tag="card" k="danz.floors" accent={AZURE} className="[&>*]:h-full" />
          <B tag="card" k="danz.heartsync" accent={AZURE} className="[&>*]:h-full" />
          <B tag="card" k="danz.host" accent={AZURE} className="[&>*]:h-full" />
        </div>
      </div>
    </Stage>
  );
}

/**
 * The 99,999 → 15 proof gets its own chapter and its own enormous number.
 * It is the single most persuasive fact in the whole proposal, because it is
 * the only claim in it that the reader can go and reproduce herself.
 */
export function ChapterDanzProof() {
  const timeline = useCallback((_s: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo('[data-in="claim"]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0)
      .fromTo('[data-in="arrow"]', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, ease: 'power2.inOut' }, 0.2)
      .fromTo(
        '[data-in="recorded"]',
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, ease: 'back.out(2)' },
        0.32,
      )
      .fromTo('[data-in="proofCopy"]', { opacity: 0, y: 34 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0.5);
  }, []);

  return (
    <Stage id="danz-proof" tab="Already running" accent={ROSE} beats={3} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="Already running" accent={ROSE} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <p className="t-tag mb-8" style={{ color: ROSE }}>
          04 · Tested in production, on purpose
        </p>

        <div className="mb-10 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div data-in="claim">
            <p className="t-mono mb-2 text-white/60">The browser claimed</p>
            <p className="t-display text-[clamp(2.6rem,9vw,7rem)] leading-[0.82] text-white/35 line-through">
              99,999
            </p>
          </div>
          <div
            data-in="arrow"
            className="mb-6 h-[3px] w-16 origin-left"
            style={{ background: ROSE }}
            aria-hidden="true"
          />
          <div data-in="recorded">
            <p className="t-mono mb-2" style={{ color: ROSE }}>
              The ledger recorded
            </p>
            <p className="t-display text-[clamp(3.4rem,12vw,10rem)] leading-[0.82]" style={{ color: GOLD }}>
              15
            </p>
          </div>
        </div>

        <div className="max-w-[54rem]" data-in="proofCopy">
          <B k="danz.xp" accent={ROSE} anim={false} />
        </div>
      </div>
    </Stage>
  );
}

export function ChapterDanzFit() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.04);
    tl.fromTo(
      stage.querySelectorAll('[data-card]'),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, stagger: 0.13, ease: 'power3.out' },
      0,
    ).fromTo('[data-in="fit"]', { opacity: 0, y: 34 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0.28);
  }, []);

  return (
    <Stage id="danz-fit" tab="Already running" accent={AZURE} beats={3} timeline={timeline} hold>
      <PhotoLayer src={`${P}/alula-dancers.webp`} position="center 45%" dim={0.82} scrim="full" />
      <Tab label="Already running" accent={AZURE} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <B tag="card" k="danz.wearables_note" accent={AZURE} className="[&>*]:h-full" />
          <B tag="card" k="danz.honest" accent={ROSE} className="[&>*]:h-full" />
        </div>
        <div className="max-w-[56rem] p-6" style={{ background: 'var(--ink)' }} data-in="fit">
          <B k="danz.fit" accent={AZURE} anim={false} />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 07 — HEARTS                                                          */
/* ==================================================================== */

export function ChapterHearts() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.02);
    tl.fromTo('[data-in="heartsHead"]', { opacity: 0, x: -40 }, { opacity: 1, x: 0, ease: 'power3.out' }, 0)
      .fromTo(
        stage.querySelectorAll('[data-card]'),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.12, ease: 'power3.out' },
        0.4,
      );
  }, []);

  return (
    <Stage id="hearts" tab="The currency" accent={ROSE} beats={3} timeline={timeline} hold>
      <PhotoLayer src={`${P}/golden-dancer.webp`} position="center 38%" dim={0.5} scrim="left" />
      <Tab label="The currency" accent={ROSE} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-8 max-w-[42rem]" data-in="heartsHead">
          <B k="hearts.head" accent={ROSE} anim={false} />
        </div>
        <div className="grid max-w-[58rem] gap-4 md:grid-cols-2">
          <B tag="card" k="hearts.closed_loop" accent={ROSE} className="[&>*]:h-full" />
          <B tag="card" k="hearts.append_only" accent={ROSE} className="[&>*]:h-full" />
        </div>
      </div>
    </Stage>
  );
}

export function ChapterHeartRules() {
  const timeline = useCallback((_s: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo('[data-in="rules"]', { opacity: 0, y: 50 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0);
  }, []);

  return (
    <Stage id="heart-rules" tab="The currency" accent={SUN} beats={2} timeline={timeline} hold>
      <div className="absolute inset-0" style={{ background: SUN }} />
      <Tab label="The currency" accent="var(--ink)" />
      <div className="on-color relative flex h-full items-center u-pad">
        <div className="max-w-[54rem]" data-in="rules">
          <B k="hearts.four_rules" accent="var(--ink)" onColor anim={false} />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 08 — INVENTORY · the ledger fills in                                 */
/* ==================================================================== */

const INVENTORY_LIVE = [
  'inventory.identity',
  'inventory.split_payments',
  'inventory.referral_graph',
  'inventory.ledger',
  'inventory.infra',
];

const INVENTORY_REST = [
  'inventory.upload',
  'inventory.dance_chain',
  'inventory.hearts_rules',
  'inventory.feed',
  'inventory.class_page',
  'inventory.autoclip',
  'inventory.mobile',
  'inventory.wearables',
  'inventory.dance_coin',
  'inventory.prize_payout',
];

/**
 * Split in two so neither half needs an internal scrollbar. A scrollbar
 * inside a pinned chapter is the single most confusing thing you can put on
 * a scroll site — you cannot tell which surface your gesture is driving.
 */
function InventoryChapter({
  id,
  kicker,
  keys,
  tail,
}: {
  id: string;
  kicker: string;
  keys: string[];
  tail?: string;
}) {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    // Rows arrive one at a time, like a ledger being written.
    tl.fromTo(
      stage.querySelectorAll('[data-row]'),
      { opacity: 0, x: -26 },
      { opacity: 1, x: 0, stagger: 0.06, ease: 'power2.out' },
      0,
    );
  }, []);

  return (
    <Stage id={id} tab="Honest inventory" accent="var(--paper)" beats={2.8} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="Honest inventory" accent="var(--paper)" />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <p className="t-tag mb-5" style={{ color: 'var(--paper)' }}>
          {kicker}
        </p>
        <div>
          {keys.map((k) => (
            <div key={k} data-row>
              <B k={k} accent="var(--paper)" anim={false} />
            </div>
          ))}
        </div>
        {tail && (
          <div className="mt-7 max-w-[52rem]" data-row>
            <B k={tail} accent="var(--paper)" anim={false} />
          </div>
        )}
      </div>
    </Stage>
  );
}

export function ChapterInventoryHead() {
  const timeline = useCallback((_s: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo('[data-in="invHead"]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0);
  }, []);
  return (
    <Stage id="inventory" tab="Honest inventory" accent="var(--paper)" beats={1.8} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="Honest inventory" accent="var(--paper)" />
      <div className="relative flex h-full items-center u-pad">
        <div className="max-w-[48rem]" data-in="invHead">
          <B k="inventory.head" accent="var(--paper)" anim={false} />
        </div>
      </div>
    </Stage>
  );
}

export const ChapterInventoryLive = () => (
  <InventoryChapter id="inventory-live" kicker="06 · Running in production today" keys={INVENTORY_LIVE} />
);

export const ChapterInventoryRest = () => (
  <InventoryChapter
    id="inventory-rest"
    kicker="06 · What we wire · what waits"
    keys={INVENTORY_REST}
    tail="inventory.exclusions_note"
  />
);

/* ==================================================================== */
/* 09 — THE PLAN · horizontal timeline                                  */
/* ==================================================================== */

export const ChapterPlan = () => (
  <FocusDeck
    id="plan-steps"
    tab="Delivery"
    accent={VIOLET}
    kicker="07 · Twelve weeks to a public MVP"
    keys={[
      'plan.wk01_02',
      'plan.wk03_05',
      'plan.wk06_07',
      'plan.wk08_09',
      'plan.wk10_11',
      'plan.wk12',
    ]}
  />
);

/** The section's own statement gets a still panel before the deck runs. */
export function ChapterPlanHead() {
  const timeline = useCallback((_s: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo('[data-in="planHead"]', { opacity: 0, y: 44 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0);
  }, []);
  return (
    <Stage id="plan" tab="Delivery" accent={VIOLET} beats={2} timeline={timeline} hold>
      <div className="absolute inset-0" style={{ background: VIOLET }} />
      <Tab label="Delivery" accent="var(--ink)" />
      <div className="on-color relative flex h-full items-center u-pad">
        <div className="max-w-[46rem]" data-in="planHead">
          <B k="plan.head" accent="var(--ink)" onColor anim={false} />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 10 — WHAT WE NEED                                                    */
/* ==================================================================== */

const NEED_GROUPS: { label: string; when: string; accent: string; keys: string[] }[] = [
  {
    label: 'Decisions',
    when: 'Week one',
    accent: ROSE,
    keys: [
      'need.dec.hearts_rules',
      'need.dec.what_counts',
      'need.dec.cause_colors',
      'need.dec.move_ownership',
      'need.dec.price',
    ],
  },
  {
    label: 'Access',
    when: 'Weeks 1–2',
    accent: AZURE,
    keys: [
      'need.acc.dns',
      'need.acc.stripe',
      'need.acc.dev_accounts',
      'need.acc.brand_assets',
      'need.acc.social',
    ],
  },
  {
    label: 'Legal',
    when: 'Weeks 2–4',
    accent: VIOLET,
    keys: [
      'need.leg.entity',
      'need.leg.participant_terms',
      'need.leg.privacy',
      'need.leg.age',
      'need.leg.teacher_agreement',
    ],
  },
  {
    label: 'Content & people',
    when: 'Weeks 4–8',
    accent: SUN,
    keys: [
      'need.con.cohort',
      'need.con.her_move',
      'need.con.class_calendar',
      'need.con.moderation_owner',
      'need.con.s2_date',
    ],
  },
];

/**
 * Two chapters of two groups each, so five items per column fit on screen
 * without an internal scrollbar and without shrinking the type.
 */
function NeedChapter({ id, kicker, groups }: { id: string; kicker: string; groups: typeof NEED_GROUPS }) {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.05);
    tl.fromTo(
      stage.querySelectorAll('[data-col]'),
      { opacity: 0, y: 46 },
      { opacity: 1, y: 0, stagger: 0.12, ease: 'power3.out' },
      0.05,
    );
  }, []);

  return (
    <Stage id={id} tab="Your side" accent={GOLD} beats={2.8} timeline={timeline} hold>
      <PhotoLayer src={`${P}/alula-canyon.webp`} position="center 45%" dim={0.82} scrim="full" />
      <Tab label="Your side" accent={GOLD} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <p className="t-tag mb-6" style={{ color: GOLD }}>
          {kicker}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.label} data-col className="p-6" style={{ background: 'var(--ink)' }}>
              <p className="t-tag mb-1" style={{ color: g.accent }}>
                {g.label}
              </p>
              <p className="t-mono mb-4 text-white/55">{g.when}</p>
              {g.keys.map((k) => (
                <B key={k} k={k} accent={g.accent} anim={false} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

export function ChapterNeedHead() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.04);
    tl.fromTo('[data-in="needHead"]', { opacity: 0, x: -40 }, { opacity: 1, x: 0, ease: 'power3.out' }, 0);
  }, []);
  return (
    <Stage id="need" tab="Your side" accent={GOLD} beats={2} timeline={timeline} hold>
      <PhotoLayer src={`${P}/alula-canyon.webp`} position="center 45%" dim={0.62} scrim="left" />
      <Tab label="Your side" accent={GOLD} />
      <div className="relative flex h-full items-center u-pad">
        <div className="max-w-[44rem]" data-in="needHead">
          <B k="need.head" accent={GOLD} anim={false} />
        </div>
      </div>
    </Stage>
  );
}

export const ChapterNeedA = () => (
  <NeedChapter id="need-a" kicker="08 · Week one · decisions and access" groups={NEED_GROUPS.slice(0, 2)} />
);

export const ChapterNeedB = () => (
  <NeedChapter id="need-b" kicker="08 · Weeks two to eight · legal, content and people" groups={NEED_GROUPS.slice(2)} />
);

/* ==================================================================== */
/* 11 — MONEY                                                           */
/* ==================================================================== */

export function ChapterMoney() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.03);
    tl.fromTo('[data-in="moneyHead"]', { opacity: 0, x: -40 }, { opacity: 1, x: 0, ease: 'power3.out' }, 0)
      .fromTo(
        stage.querySelectorAll('[data-card]'),
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, stagger: 0.13, ease: 'back.out(1.4)' },
        0.42,
      );
  }, []);

  return (
    <Stage id="money" tab="The model" accent={SUN} beats={3} timeline={timeline} hold>
      <PhotoLayer src={`${P}/ithra.webp`} position="center 50%" dim={0.8} scrim="full" />
      <Tab label="The model" accent={SUN} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-8 max-w-[46rem]" data-in="moneyHead">
          <B k="money.head" accent={SUN} anim={false} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <B tag="card" k="money.stat_zero" accent={SUN} className="[&>*]:h-full" />
          <B tag="card" k="money.stat_scratch" accent={SUN} className="[&>*]:h-full" />
          <B tag="card" k="money.stat_built" accent={SUN} className="[&>*]:h-full" />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 11b — THE DEAL                                                       */
/* ==================================================================== */

export function ChapterDeal() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    // "10%" lands first and lands hard — it is the headline of the chapter,
    // not a number buried in a paragraph.
    tl.fromTo('[data-in="dealHead"]', { opacity: 0, y: 44 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0)
      .fromTo(
        '[data-in="dealFigure"]',
        { opacity: 0, scale: 0.82 },
        { opacity: 1, scale: 1, ease: 'back.out(1.7)' },
        0.16,
      )
      .fromTo(
        stage.querySelectorAll('[data-card]'),
        { opacity: 0, y: 44 },
        { opacity: 1, y: 0, stagger: 0.14, ease: 'power3.out' },
        0.3,
      );
  }, []);

  return (
    <Stage id="deal" tab="The structure" accent={GOLD} beats={3} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="The structure" accent={GOLD} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-8 max-w-[46rem]" data-in="dealHead">
          <B k="deal.head" accent={GOLD} anim={false} />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div data-in="dealFigure">
            <B k="deal.equity" accent={GOLD} anim={false} />
          </div>
          <div className="grid gap-4">
            <B tag="card" k="deal.lead" accent={GOLD} />
            <B tag="card" k="deal.contracts" accent={GOLD} />
          </div>
        </div>
      </div>
    </Stage>
  );
}

export function ChapterRunningCost() {
  const timeline = useCallback((_s: HTMLElement, tl: gsap.core.Timeline) => {
    tl.fromTo('[data-in="cost"]', { opacity: 0, y: 46 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0)
      .fromTo('[data-in="dealClose"]', { opacity: 0, y: 34 }, { opacity: 1, y: 0, ease: 'power3.out' }, 0.22);
  }, []);

  return (
    <Stage id="running-cost" tab="The structure" accent={SUN} beats={2.6} timeline={timeline} hold>
      <div className="absolute inset-0 bg-ink" />
      <Tab label="The structure" accent={SUN} />
      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-6 max-w-[56rem]" data-in="cost">
          <B k="deal.expenses" accent={SUN} anim={false} />
        </div>
        <div className="max-w-[52rem]" data-in="dealClose">
          <B k="deal.close" accent={SUN} anim={false} />
        </div>
      </div>
    </Stage>
  );
}

/* ==================================================================== */
/* 12 — SEVEN DAYS                                                      */
/* ==================================================================== */

export function ChapterNext() {
  const timeline = useCallback((stage: HTMLElement, tl: gsap.core.Timeline) => {
    pullBack(stage, tl, 1.04);
    tl.fromTo(
      stage.querySelectorAll('[data-row]'),
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, stagger: 0.085, ease: 'power2.out' },
      0.06,
    );
  }, []);

  return (
    <Stage id="next" tab="Immediate" accent={GOLD} beats={3.2} timeline={timeline} hold>
      <PhotoLayer src={`${P}/diriyah-sunset.webp`} position="center 50%" dim={0.8} scrim="full" />
      <Tab label="Immediate" accent={GOLD} />

      <div className="relative flex h-full flex-col justify-center u-pad">
        <div className="mb-6 max-w-[42rem]">
          <B k="next.head" accent={GOLD} />
        </div>
        <div className="grid gap-x-8 md:grid-cols-2">
          {['next.01', 'next.02', 'next.03', 'next.04', 'next.05', 'next.06', 'next.07'].map((k) => (
            <div key={k} data-row>
              <B k={k} accent={GOLD} anim={false} />
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}
