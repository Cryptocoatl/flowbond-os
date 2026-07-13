/**
 * Future Flight — landing content model.
 *
 * Every price, date, seat count, funding level and sponsor package is a typed
 * value here with a default matching docs/future-flight/index.html. Components
 * receive these as props; nothing is hardcoded in JSX. In Phase 4 these defaults
 * are replaced by rows from ff_editions / ff_ticket_tiers / ff_membership_tiers /
 * ff_funding_levels / ff_sponsor_packages via the Supabase client.
 */

export interface Edition {
  /** wide display lockup, e.g. "FUTURE" + "FLIGHT" */
  wordmarkTop: string
  wordmarkBottom: string
  originCode: string // MIA
  destCode: string // TQO
  routeLabel: string // "MIAMI → TULUM"
  dateLabel: string // "December 8, 2026"
  tagline: string
  /** local departure instant used for the countdown */
  departISO: string
}

export interface RouteStop {
  label: string
  dates: string
  highlight?: boolean
}

export interface Pillar {
  icon: string
  label: string
}

export interface ExperienceStep {
  n: string
  title: string
  body: string
}

export interface TicketTier {
  name: string
  seats: number
  benefits: string[]
  priceUSD: number
  featured?: boolean
}

export interface Membership {
  priceUSD: number
  name: string
}

export interface SponsorPackage {
  name: string
  slots: number
  benefits: string[]
  amountUSD: number
}

export interface FundingLevel {
  level: number
  title: string
  planeName: string
  unlocks: string
  /** display target, e.g. "$80K" or "$300K+" */
  targetLabel: string
  /** funded percentage 0–100 for the progress ring */
  pct: number
}

export interface LiveFunding {
  securedUSD: number
  targetUSD: number
  note: string
}

export interface PassportRow {
  label: string
  value: string
  gold?: boolean
}

export interface PassportPreview {
  name: string
  role: string
  route: string
  date: string
  rows: PassportRow[]
}

export interface PassportFeature {
  icon: string
  title: string
  body: string
}

export interface IncludedItem {
  icon: string
  label: string
}

export interface Stat {
  value: string
  label: string
}

export interface EscrowNode {
  label: string
  sub: string
  highlight?: boolean
}

export interface LandingContent {
  edition: Edition
  routeStrip: RouteStop[]
  pillars: Pillar[]
  band: string
  experience: { eyebrow: string; heading: string; steps: ExperienceStep[] }
  tickets: {
    eyebrow: string
    heading: string
    tiers: TicketTier[]
    membershipLabel: string
    memberships: Membership[]
    membershipNote: string
  }
  sponsors: { eyebrow: string; heading: string; packages: SponsorPackage[] }
  funding: {
    eyebrow: string
    heading: string
    levels: FundingLevel[]
    live: LiveFunding
    liveLabel: string
  }
  passport: {
    eyebrow: string
    heading: string
    preview: PassportPreview
    features: PassportFeature[]
  }
  included: { eyebrow: string; items: IncludedItem[] }
  stats: Stat[]
  escrow: {
    eyebrow: string
    heading: string
    nodes: EscrowNode[]
    trust: string[]
    ctaHeading: string
  }
  footer: { creed: string[]; poweredBy: string }
}

export const defaultContent: LandingContent = {
  edition: {
    wordmarkTop: 'FUTURE',
    wordmarkBottom: 'FLIGHT',
    originCode: 'MIA',
    destCode: 'TQO',
    routeLabel: 'MIAMI → TULUM',
    dateLabel: 'December 8, 2026',
    tagline: 'The journey begins before we land.',
    departISO: '2026-12-08T09:30:00',
  },
  routeStrip: [
    { label: 'Miami · BitBasel', dates: 'Dec 5–7' },
    { label: 'Future Flight', dates: 'Dec 8', highlight: true },
    { label: 'Tulum Innovation Fest', dates: 'Dec 9–12' },
  ],
  pillars: [
    { icon: '✈', label: 'Journey' },
    { icon: '◎', label: 'Community' },
    { icon: '✦', label: 'Opportunity' },
    { icon: '❦', label: 'Regeneration' },
    { icon: '◍', label: 'Global Impact' },
  ],
  band: 'One flight. One community. Infinite impact.',
  experience: {
    eyebrow: 'The Miami → Tulum Experience',
    heading: 'Six chapters, one arc.',
    steps: [
      { n: '01', title: 'Before Departure', body: 'Access the Future Flight portal. Connect, match, and plan before you fly.' },
      { n: '02', title: 'Miami Landing Week', body: 'Founder dinners, art & culture, investor meetings and the podcast studio.' },
      { n: '03', title: 'Departure Day', body: 'VIP terminal, welcome kit, photo & media, and networking hosts.' },
      { n: '04', title: 'The Flight', body: 'Founder talks, investor circles, live podcast, AI matchmaking, sky toast.' },
      { n: '05', title: 'Arrival in Tulum', body: 'VIP transfers, Mayan welcome, media moment and arrival ceremony.' },
      { n: '06', title: 'The Opening Celebration', body: 'Sunset ceremony, live music, community dinner — the future begins.' },
    ],
  },
  tickets: {
    eyebrow: 'Tickets & Memberships',
    heading: 'Choose how you fly.',
    tiers: [
      {
        name: 'EXPLORER',
        seats: 40,
        benefits: ['Flight Ticket', 'Welcome Kit', 'Community Access', 'Digital Passport', 'Arrival Experience'],
        priceUSD: 1500,
      },
      {
        name: 'FOUNDER',
        seats: 35,
        benefits: ['Everything in Explorer', 'AI Matchmaking', 'Priority Networking', 'Premium Seating', 'Partner Offers'],
        priceUSD: 2500,
      },
      {
        name: 'VISIONARY',
        seats: 20,
        benefits: ['Everything in Founder', 'VIP Lounge Access', 'Investor Introductions', 'Featured Profile', 'Concierge Support'],
        priceUSD: 5000,
        featured: true,
      },
      {
        name: 'LEGACY CIRCLE',
        seats: 5,
        benefits: ['Everything in Visionary', 'Private Dinner', 'Executive Concierge', 'Media Feature', 'Legacy Membership'],
        priceUSD: 10000,
      },
    ],
    membershipLabel: 'Memberships (Annual)',
    memberships: [
      { priceUSD: 499, name: 'Explorer' },
      { priceUSD: 999, name: 'Founder' },
      { priceUSD: 2500, name: 'Visionary' },
    ],
    membershipNote:
      'Community, events, partner offers, and early access to future flights & experiences.',
  },
  sponsors: {
    eyebrow: 'Sponsor Partnerships',
    heading: 'Own an experience. Build the future.',
    packages: [
      { name: 'Presenting Partner', slots: 1, benefits: ['Naming Rights', 'Aircraft Branding', 'All Media & Content', 'Speaking Opportunity'], amountUSD: 150000 },
      { name: 'Platinum Partner', slots: 4, benefits: ['Own a Major Experience', 'Founder Lounge / Podcast Studio', 'Investor Hub / Welcome Celebration'], amountUSD: 50000 },
      { name: 'Gold Partner', slots: 10, benefits: ['Own an Activation', 'Coffee / Wellness / AI Demo', 'Charging Stations / Gifts'], amountUSD: 20000 },
      { name: 'Silver Partner', slots: 20, benefits: ['Brand Visibility Across', 'Digital Channels / Welcome Kit', 'Community / Social / Web'], amountUSD: 10000 },
    ],
  },
  funding: {
    eyebrow: 'Aircraft & Funding Tiers',
    heading: 'The more we build together, the higher we fly.',
    levels: [
      { level: 1, title: 'Launch', planeName: 'Regional Jet', unlocks: 'Flight Confirmed · Welcome Kit · Community Access', targetLabel: '$80K', pct: 100 },
      { level: 2, title: 'Experience Upgrade', planeName: 'Embraer E195', unlocks: 'VIP Lounge · Media Crew · AI Matchmaking · Better Catering', targetLabel: '$120K', pct: 72 },
      { level: 3, title: 'Signature Experience', planeName: 'Boeing 737', unlocks: 'Podcast Studio · Investor Lounge · Documentary · Brand Activations', targetLabel: '$180K', pct: 41 },
      { level: 4, title: 'Legendary Edition', planeName: 'Full Production', unlocks: 'Celebrity Keynote · Premium Activation · Global Live Stream', targetLabel: '$300K+', pct: 18 },
    ],
    live: { securedUSD: 130000, targetUSD: 180000, note: 'secured — Level 3 within reach' },
    liveLabel: 'Live Progress · Escrow Funded',
  },
  passport: {
    eyebrow: 'Digital Passport',
    heading: 'Your journey. Your legacy.',
    preview: {
      name: 'Steph Ferrera',
      role: 'Visionary Member',
      route: 'MIAMI → TULUM',
      date: 'Dec 8, 2026',
      rows: [
        { label: 'Flight Ticket', value: 'Confirmed', gold: true },
        { label: 'Seat', value: '1A' },
        { label: 'Member Since', value: 'May 2026' },
        { label: 'Matches', value: '23' },
      ],
    },
    features: [
      { icon: '◈', title: 'All-Access Pass', body: 'Tickets, events, lounges, transfers — one identity, everywhere.' },
      { icon: '✦', title: 'AI Matchmaking', body: 'Smart connections that create real opportunities, before you land.' },
      { icon: '◎', title: 'Travel Concierge', body: 'Personal support for your entire journey.' },
      { icon: '⏱', title: 'Lifetime History', body: 'Every flight. Every connection. Your legacy, on-chain-ready.' },
    ],
  },
  included: {
    eyebrow: "What's Included",
    items: [
      { icon: '✈', label: 'Flight Ticket' },
      { icon: '◪', label: 'VIP Terminal Access' },
      { icon: '🎁', label: 'Welcome Kit & Gifts' },
      { icon: '◫', label: 'Onboard Experience' },
      { icon: '✦', label: 'AI Matchmaking' },
      { icon: '◈', label: 'Digital Passport' },
      { icon: '⇄', label: 'Arrival Transfers' },
      { icon: '❋', label: 'Opening Celebration' },
      { icon: '◍', label: 'Community Access' },
      { icon: '★', label: 'Lifelong Connections' },
    ],
  },
  stats: [
    { value: '100+', label: 'Curated Members' },
    { value: '20+', label: 'Countries' },
    { value: '15+', label: 'Industries' },
    { value: '50+', label: 'Speakers & Investors' },
    { value: '1', label: 'Legendary Experience' },
  ],
  escrow: {
    eyebrow: 'Secure & Transparent',
    heading: 'Every payment, accountable.',
    nodes: [
      { label: 'Tickets', sub: 'Sponsors · Experiences' },
      { label: 'Escrow Treasury', sub: 'Held in reserve', highlight: true },
      { label: 'Costs & Obligations', sub: 'Aircraft · Insurance · Production' },
      { label: 'Profit Split', sub: '50% FlowBond · 50% Local Partner' },
    ],
    trust: ['◈ Transparent', '⚙ Automated', '🛡 Secure', '▤ Auditable'],
    ctaHeading: 'The future meets here.',
  },
  footer: {
    creed: ['We Connect', 'We Fly', 'We Create', 'We Regenerate', 'We Lead'],
    poweredBy: 'Powered by FlowBond · thefutureflight.com',
  },
}

/** Format a whole-USD amount as "$1,500". */
export function usd(amount: number): string {
  return '$' + amount.toLocaleString('en-US')
}
