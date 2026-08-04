// FlowBond — site copy. Brand law: FlowBond (one word), the intelligence layer is
// FlowMe OS, and the tagline always credits V. Creativo.
//
// POSITIONING (2026-08-03): FlowBond builds and runs software for businesses.
// The landing sells outcomes in plain language; the depth pages (/technology,
// /docs) carry the proof. No vendor names, no ZK/ICP vocabulary above the fold.

export const LINKS = {
  docs: '/docs',
  deck: 'https://deck.flowbond.life',
  contact: '/contact',
}

export const NAV = {
  links: [
    { href: '/work', label: 'Work' },
    { href: '/services', label: 'Services' },
    { href: '/technology', label: 'Technology' },
    { href: '/docs', label: 'Docs' },
  ],
  cta: { href: '/contact', label: 'Start a project' },
}

export const HERO = {
  eyebrow: 'Software studio & platform company',
  creditPrefix: 'a phrase by',
  creditName: 'V. Creativo',
  h1a: 'If you can imagine it,',
  h1b: 'you can program it',
  sub: 'FlowBond builds and runs the software your business lives on — websites, platforms, and apps, with intelligence woven through them, payments that work across borders, and rewards that reach into the real world.',
  ctaPrimary: 'Start a project',
  ctaGhost: 'See our work',
}

/** Live client sites. Every URL here is checked before it ships — a dead link on
 *  a portfolio is worse than no portfolio. */
export const PROOF = {
  tag: 'Live in production',
  lead: 'Real businesses, running on software we built and still look after.',
  items: [
    { name: 'Legatum', what: 'Asset protection firm', href: 'https://legatum.lat' },
    { name: 'Mayan Transfers', what: 'Travel booking platform', href: 'https://mayantransfers.tours' },
    { name: 'Voces para el Alma', what: 'Wellness marketplace', href: 'https://voces.world' },
    { name: 'Tevo Salgado', what: 'Artist platform', href: 'https://tevosalgado.com' },
    { name: 'La Vida es Bella', what: 'Coaching practice', href: 'https://lavidaesbella.site' },
    { name: 'BrandMark', what: 'Print & merch studio', href: 'https://brandmark.click' },
  ],
  cta: { label: 'See the work in detail', href: '/work' },
}

export const WHATWEDO = {
  tag: 'What we do',
  lead: 'Three things, and we do all three for the same client.',
  cards: [
    {
      cls: 'ai',
      num: '01',
      stroke: '#c084fc',
      kicker: 'Build',
      h3: 'We build the thing.',
      body: 'Your website, your platform, your app — designed and built end to end. Not a template with your logo on it: the actual system your business runs on, shaped around how you already work.',
      feats: ['Websites & storefronts', 'Booking & marketplace platforms', 'Web and mobile apps', 'Internal admin tools'],
    },
    {
      cls: 'chain',
      num: '02',
      stroke: '#ffd98a',
      kicker: 'Run',
      h3: 'We keep it running.',
      body: 'Hosting, security, backups, updates, and someone who answers when something breaks. You own everything we build — we just stay responsible for it staying up.',
      feats: ['Hosting & domains', 'Security & backups', 'Ongoing changes', 'Real human support'],
    },
    {
      cls: 'life',
      num: '03',
      stroke: '#6ef0b8',
      kicker: 'Grow',
      h3: 'We help it grow.',
      body: 'The parts that usually cost you a whole team: intelligence that handles the repetitive work, payments that reach customers in other countries, and rewards that bring people back.',
      feats: ['Intelligence, built in', 'Cross-border payments', 'Rewards & loyalty', 'One login across your products'],
    },
  ],
}

export const INTELLIGENCE = {
  tag: 'Intelligence, woven in',
  h2: 'Not a chatbot bolted on the side.',
  body: 'Intelligence sits inside the product, where the work actually happens. It answers your customers in their language, drafts what you would have written, watches for the transaction that does not look right, and handles the parts of the job nobody wants to do twice.',
  bodyB: 'It works from your real data — your prices, your inventory, your bookings — so it cannot invent an answer you would have to honour.',
  list: [
    { ic: 'ANSWER', body: 'Customers get a straight answer at 2am, in whichever language they asked in — and only from what is actually true in your system.' },
    { ic: 'ASSIST', body: 'The admin side gets a hand: drafting, summarising, sorting, and surfacing the thing you were about to miss.' },
    { ic: 'WATCH', body: 'Quiet checks running underneath — unusual transactions, stock that stopped moving, a booking that never got confirmed.' },
  ],
  terminal: [
    { c: 'u', t: '> Guest asks: “can you take 6 people and 4 surfboards to Tulum?”' },
    { c: 'a', t: '✦ FlowMe OS' },
    { c: 'm', t: '  Checking fleet, capacity, and published rates…' },
    { c: 'v', t: '  Van (8 seats) available · surfboard add-on configured' },
    { c: 'v', t: '  Rate: published — no estimate invented' },
    { c: 'a', t: '  → Answer the guest, hold the vehicle, notify the operator.' },
    { c: 'm', t: '  Replied in English. Booking held for 30 minutes.' },
  ],
}

export const PAYMENTS = {
  tag: 'Payments that cross borders',
  h2: 'Your customers pay the way they pay at home. You get paid where you are.',
  body: 'Most platforms quietly assume everyone banks the same way. They do not. We wire up the payment methods your customers actually use in their country, and the payout rail that actually reaches you in yours — cards, local transfers, wallets, and bank deposits across currencies.',
  cells: [
    { ic: 'IN', h4: 'Local payment methods', p: 'Cards, bank transfer, cash vouchers, wallets — whatever is normal where your customer lives.' },
    { ic: 'SPLIT', h4: 'Split at the source', p: 'When several people share a sale, each side is paid directly by the payment provider. The money does not detour through us.' },
    { ic: 'OUT', h4: 'Payouts that arrive', p: 'Sellers choose how they get paid and in which currency, with real exchange rates rather than a number we made up.' },
    { ic: 'PROOF', h4: 'A ledger you can audit', p: 'Every split, fee, and payout is recorded and append-only, so the numbers reconcile without anyone taking your word for it.' },
  ],
  // Regulatory posture. This paragraph is load-bearing — do not soften it into
  // marketing language, and do not let the site imply FlowBond moves money.
  disclosure:
    'To be precise about what we are: FlowBond builds software. Payments are processed by licensed providers, and our clients are the merchant of record for their own sales. We are not a bank, a money transmitter, or an exchange, and we hold no private keys.',
}

export const REWARDS = {
  tag: 'Rewards that reach the real world',
  h2: 'The part where the internet touches the street.',
  body: 'Points that only ever buy more points are a dead end. We build reward systems where showing up somewhere, finishing something, or bringing someone with you is what earns — and where what you earn is worth something you can actually use.',
  bodyB: 'It runs on one account that works across everything you own, so a customer who arrives through one of your products is recognised in all of them.',
  cells: [
    { ic: 'ONE', h4: 'One account, all your products', p: 'Customers sign in once. You stop rebuilding login, and stop losing people at the door.' },
    { ic: 'EARN', h4: 'Earned by doing, not clicking', p: 'Real actions — a visit, a completed booking, a referral that stuck — are what move the balance.' },
    { ic: 'SPEND', h4: 'Worth something offline', p: 'Redeemable against real products, services, and access, not a scoreboard nobody looks at.' },
    { ic: 'SAFE', h4: 'Safe by construction', p: 'Balances are append-only and access is checked per person, so rewards cannot be quietly minted or drained.' },
  ],
}

export const HOW = {
  tag: 'How it works',
  lead: 'No discovery-phase theatre. Four steps, and you know the price before the second one.',
  cards: [
    { n: '01 · TALK', h4: 'We talk', p: 'One conversation about what your business actually does and where it is losing time or money. Free, and you leave with an opinion whether or not you hire us.' },
    { n: '02 · PLAN', h4: 'You get a plan', p: 'Scope, price, and a delivery date in writing. Fixed price for defined work — no hourly meter running in the background.' },
    { n: '03 · BUILD', h4: 'We build it', p: 'You see it as it goes up, on a real link you can open, not in a slide deck. You approve what ships.' },
    { n: '04 · RUN', h4: 'We run it', p: 'It goes live on your domain, and stays looked after. Changes are a message away, not a new project.' },
  ],
}

export const FINAL = {
  h2a: 'Tell us what you',
  h2b: 'need built',
  body: 'One conversation is enough to know whether we are the right people for it. If we are not, we will tell you that too.',
  cta: 'Start a project',
  ghost: 'Read the docs',
  placeholder: 'you@yourbusiness.com',
}

export const FOOTER = {
  brandBlurb: 'FlowBond builds and runs the software businesses live on. Technology, mastered in service of life.',
  credit: '“If you can imagine it, you can program it”',
  creditName: 'V. Creativo',
  cols: [
    {
      h5: 'Work with us',
      links: [
        { label: 'Our work', href: '/work' },
        { label: 'Services & pricing', href: '/services' },
        { label: 'Start a project', href: '/contact' },
      ],
    },
    {
      h5: 'Build',
      links: [
        { label: 'Documentation', href: '/docs' },
        { label: 'Technology', href: '/technology' },
        { label: 'Trust & security', href: '/docs/trust' },
        { label: 'Deck ↗', href: 'https://deck.flowbond.life' },
      ],
    },
    {
      h5: 'Company',
      links: [
        { label: 'Founder', href: '/founder' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
  // Entity note: the old Texas corporation is being dissolved and must not appear
  // as the owner of this site. The Delaware entity is not formed yet — do not
  // write "FlowBond, Inc." here until the certificate issues.
  copyright: '© 2026 FlowBond · flowbond.life',
  tagline: 'In service of life ◇',
}
