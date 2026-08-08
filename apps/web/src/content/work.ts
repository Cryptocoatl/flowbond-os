// /work — the portfolio. Ground rule: every `href` here must return 200 before
// it ships, and nothing gated or private goes on this page. Códice Vivo and the
// Moon Church book are deliberately absent — both are login-gated and noindex.
// TEP (tuestratega.mx) is absent because it is not resolving and is blocked on
// regulatory review.

export type CaseStudy = {
  slug: string
  name: string
  kind: string
  href: string
  year: string
  summary: string
  built: string[]
  outcome: string
  tags: string[]
  accent: 'ai' | 'chain' | 'life'
}

export const CASES: CaseStudy[] = [
  {
    slug: 'legatum',
    name: 'Legatum',
    kind: 'Asset-protection firm · México',
    href: 'https://legatum.lat',
    year: '2026',
    summary:
      'A law practice that needed to look as serious as it is, and to stop losing enquiries in a personal inbox.',
    built: [
      'Public site and service pages in the firm’s own voice',
      'Enquiry capture that lands as a tracked lead, not an email nobody owns',
      'Professional email on the firm’s own domain',
      'An editorial process where nothing publishes without two of three partners approving it',
      'A private admin area with roles, so the right person sees the right thing',
    ],
    outcome:
      'Live on their own domain with real enquiries arriving, and a publishing process the partners actually trust.',
    tags: ['Website', 'Lead capture', 'Email', 'Governance'],
    accent: 'chain',
  },
  {
    slug: 'mayan-transfers',
    name: 'Mayan Transfers & Tours',
    kind: 'Travel booking platform · Riviera Maya',
    href: 'https://mayantransfers.tours',
    year: '2026',
    summary:
      'Private transfers and tours sold online, with the money reaching the drivers and operators who do the work.',
    built: [
      'A booking engine covering transfers, tours, and multi-vehicle group logistics',
      'Payments that pay the operator directly, with the platform’s commission taken at the payment provider itself',
      'The revenue split enforced in the database, not in code someone could edit — it cannot be bypassed',
      'Funds held until the trip is completed, then released automatically',
      'A concierge that answers travellers day and night and is structurally unable to invent a price',
      'An operations console for bookings, drivers, disputes, and refunds',
    ],
    outcome:
      'A working marketplace where the operator’s share is guaranteed by the system rather than by good intentions.',
    tags: ['Marketplace', 'Payments', 'Intelligence', 'Operations'],
    accent: 'ai',
  },
  {
    slug: 'voces',
    name: 'Voces para el Alma',
    kind: 'Wellness marketplace · cross-border',
    href: 'https://voces.world',
    year: '2026',
    summary:
      'Practitioners across several countries selling sessions, courses, and books — and actually getting paid, wherever they live.',
    built: [
      'A storefront where each practitioner has their own profile, catalogue, and calendar',
      'Payments split at the processor so each practitioner is paid directly on their own sales',
      'Payout rails that reach people in different countries and currencies, at real exchange rates',
      'Memberships, secure digital delivery, and booking that only opens after payment clears',
      'A signed commission agreement each practitioner accepts before they can sell',
    ],
    outcome:
      'Live in production with real sales settled, and an earnings ledger every practitioner can check for themselves.',
    tags: ['Marketplace', 'Cross-border payouts', 'Memberships', 'Booking'],
    accent: 'life',
  },
  {
    slug: 'tevo-salgado',
    name: 'Tevo Salgado',
    kind: 'Artist platform · music',
    href: 'https://tevosalgado.com',
    year: '2026',
    summary: 'An artist who owns his audience instead of renting it back from a platform.',
    built: [
      'A release and tour site built around the work rather than around a feed',
      'Fan capture that builds a list he owns outright',
      'A private admin area he can run himself, with a one-time code instead of another password',
      'An assistant that helps him keep the site current without a developer in the loop',
    ],
    outcome: 'Live on his own domain, with a direct line to his audience that no algorithm sits in front of.',
    tags: ['Artist site', 'Fan capture', 'Self-serve admin'],
    accent: 'ai',
  },
  {
    slug: 'la-vida-es-bella',
    name: 'La Vida es Bella',
    kind: 'Coaching practice · personal brand',
    href: 'https://lavidaesbella.site',
    year: '2026',
    summary: 'A coach with real credentials and no way for people to book or buy from her.',
    built: [
      'A fast, calm site that loads instantly anywhere',
      'A temperament assessment that turns a curious visitor into a conversation',
      'Book and session sales handled through a marketplace that pays her directly',
      'Booking that unlocks only once payment has cleared — no more unpaid no-shows',
    ],
    outcome: 'Live on her own domain, selling her book and her sessions without chasing anybody for payment.',
    tags: ['Website', 'Assessment', 'Commerce', 'Booking'],
    accent: 'life',
  },
  {
    slug: 'brandmark',
    name: 'BrandMark',
    kind: 'Print & merchandise studio',
    href: 'https://brandmark.click',
    year: '2026',
    summary: 'A studio quoting everything by hand, one message at a time.',
    built: [
      'A supplier catalogue that keeps products and pricing in one place',
      'Quoting that produces a consistent number instead of a guess',
      'Their web-design offering packaged into clear tiers a client can just choose from',
    ],
    outcome: 'Quotes that go out in minutes, and a service menu clients can buy without a negotiation.',
    tags: ['Catalogue', 'Quoting', 'Productised services'],
    accent: 'chain',
  },
]

/** Products FlowBond builds and operates itself. Separated from client work on
 *  purpose — conflating the two is how portfolios start lying. */
export const PLATFORMS = [
  { name: 'FlowOps', what: 'Point of sale, inventory, and fraud checks for businesses with more than one location.', href: 'https://ops.claudiaflow.life' },
  { name: 'FlowBond Console', what: 'The approval desk. No site we run changes without two of three people signing off.', href: 'https://build.claudiaflow.life' },
  { name: 'FlowMe', what: 'Claimable profiles and the front door to everything on one account.', href: 'https://flowme.one' },
  { name: 'AstralFlow', what: 'A social product built on the same identity and rewards spine.', href: 'https://astro.flowbond.life' },
  { name: 'FlowChords', what: 'Live chord detection for musicians, running entirely on the device.', href: 'https://chords.flowme.one' },
  { name: 'Reciprociudad', what: 'A reciprocity network for Mexico City, online and on the ground.', href: 'https://reciprociudad.lat' },
  { name: 'FlowNation', what: 'The network of cities the community is organised around.', href: 'https://flownation.world' },
  { name: 'Mountain Dogs', what: 'A community platform for a real-world rescue operation.', href: 'https://mountaindogs.app' },
]
