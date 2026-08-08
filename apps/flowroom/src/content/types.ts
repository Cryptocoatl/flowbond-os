/**
 * FlowRoom — content block type system
 * apps/flowroom/src/content/types.ts
 *
 * RULE: `key` is permanent. It is the anchor for every mark, comment and
 * attachment in the database. Changing a key orphans its annotations.
 * Add new keys freely. Never rename an existing one.
 */

export type MarkKey =
  | 'agreed'
  | 'question'
  | 'already_have'
  | 'different_timeline'
  | 'not_this';

export type Status = 'live' | 'wire' | 'later';

export type SectionKey =
  | 'hero'
  | 'system'
  | 'flow'
  | 'chain'
  | 'danz'
  | 'hearts'
  | 'inventory'
  | 'plan'
  | 'need'
  | 'money'
  | 'deal'
  | 'next';

/** Every block carries these. */
interface BlockBase {
  /** PERMANENT. Format: `<section>.<slug>` */
  key: string;
  section: SectionKey;
  /** false = decorative or structural, no mark gutter rendered */
  annotatable?: boolean;
  /** optional owner + due date, surfaced in the console when marked */
  owner?: 'steph' | 'vandana' | 'shared';
  due?: string; // ISO date
}

/* ------------------------------------------------------------------ */
/* Block payloads                                                      */
/* ------------------------------------------------------------------ */

export interface HeroBlock extends BlockBase {
  kind: 'hero';
  eyebrow: string;
  /** `_emphasis_` renders in the gold gradient */
  headline: string;
  lede: string;
  chips: { label: string; status: Status | 'neutral' }[];
}

export interface SectionHeadBlock extends BlockBase {
  kind: 'section_head';
  index: string; // "01"
  eyebrow: string;
  title: string;
  dek?: string;
}

export interface ProseBlock extends BlockBase {
  kind: 'prose';
  title?: string;
  body: string[]; // one string per paragraph
}

export interface CalloutBlock extends BlockBase {
  kind: 'callout';
  title: string;
  body: string[];
  tone?: 'gold' | 'warn';
}

export interface SiteMapBlock extends BlockBase {
  kind: 'site_map';
  sites: { domain: string; role: string }[];
  spine: { title: string; body: string };
}

export interface CardBlock extends BlockBase {
  kind: 'card';
  title: string;
  body: string;
  tech?: string;
}

export interface StageBlock extends BlockBase {
  kind: 'stage';
  n: string; // "01"
  title: string;
  body: string;
  rail: string;
  statuses: { label: string; status: Status }[];
}

export interface CompareBlock extends BlockBase {
  kind: 'compare';
  left: { title: string; body: string; note: string };
  right: { title: string; body: string; note: string };
}

export interface TableRowBlock extends BlockBase {
  kind: 'table_row';
  system: string;
  does: string;
  status: Status;
}

export interface TimelineStepBlock extends BlockBase {
  kind: 'timeline_step';
  when: string; // "WEEKS 1–2"
  dates: string; // "17–28 Aug"
  title: string;
  body: string;
  ships: string;
}

export interface NeedItemBlock extends BlockBase {
  kind: 'need_item';
  group: 'decisions' | 'access' | 'legal' | 'content';
  groupLabel: string;
  groupWhen: string;
  label: string;
  detail: string;
}

export interface StatBlock extends BlockBase {
  kind: 'stat';
  figure: string;
  accent?: 'gold' | 'rainbow';
  label: string;
  body: string;
}

export interface OptionBlock extends BlockBase {
  kind: 'option';
  letter: 'A' | 'B' | 'C';
  title: string;
  body: string;
}

export interface NextItemBlock extends BlockBase {
  kind: 'next_item';
  n: string;
  title: string;
  detail: string;
}

/** Embedded explorable Marble world (Gaussian splat via Spark/Three.js) */
export interface WorldBlock extends BlockBase {
  kind: 'world';
  title: string;
  body: string;
  /** R2 key for the .ply splat */
  splatKey: string;
  /** R2 key for the mobile/reduced-motion fallback loop */
  posterVideoKey: string;
  hint: string;
}

export type Block =
  | HeroBlock
  | SectionHeadBlock
  | ProseBlock
  | CalloutBlock
  | SiteMapBlock
  | CardBlock
  | StageBlock
  | CompareBlock
  | TableRowBlock
  | TimelineStepBlock
  | NeedItemBlock
  | StatBlock
  | OptionBlock
  | NextItemBlock
  | WorldBlock;

/* ------------------------------------------------------------------ */
/* Room                                                                */
/* ------------------------------------------------------------------ */

export interface RoomTheme {
  void: string;
  panel: string;
  raise: string;
  bone: string;
  mute: string;
  gold: [string, string];
  rainbow: string[];
  causeColors: Record<string, string>;
  display: string;
  body: string;
  mono: string;
  logoKey: string; // R2 key
}

export interface RoomContent {
  slug: string;
  title: string;
  clientName: string;
  theme: RoomTheme;
  blocks: Block[];
}
