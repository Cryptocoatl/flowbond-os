// FlowBond Life — site copy, lifted verbatim from flowbond.html so it's editable
// without touching components. Brand law: FlowBond (one word), AI OS = FlowMe OS,
// tagline always credits V. Creativo.

export const LINKS = {
  docs: 'https://docs.flowbond.life',
  deck: 'https://deck.flowbond.life',
}

export const NAV = {
  links: [
    { href: '#trinity', label: 'System' },
    { href: '#flowme', label: 'FlowMe OS' },
    { href: '#layer0', label: 'Layer 0' },
    { href: '#founder', label: 'Founder' },
  ],
}

export const HERO = {
  eyebrow: 'The Layer 0 of Life',
  creditPrefix: 'a phrase by',
  creditName: 'V. Creativo',
  sub: 'FlowBond is the living infrastructure for a regenerative internet — identity, value, and intelligence woven into one layer beneath every app you build. Technology, mastered in service of life.',
  ctaPrimary: 'Start building',
  ctaGhost: 'View the deck ↗',
}

export const MANIFESTO = {
  tag: 'Manifesto',
  body: 'For two decades the internet learned to harvest attention, identity, and trust, then sell them back to us. FlowBond inverts the stack. We treat human identity as sovereign, value as something that compounds when life flourishes, and intelligence as a tool for stewardship — not surveillance. The result is a foundation builders stand on without their users ever seeing it: invisible infrastructure, visible regeneration.',
}

export const TRINITY = {
  tag: 'The System · Three Forces',
  cards: [
    {
      cls: 'ai',
      num: '01',
      stroke: '#c084fc',
      kicker: 'Intelligence',
      h3: 'AI, woven in.',
      body: 'Imagination, compiled. FlowMe OS brings Claude-grade reasoning inside the identity layer — so every app you build ships with a mind, not just a database.',
      feats: ['FlowMe OS', 'Vision & agent tooling', 'Structured reasoning RPCs'],
    },
    {
      cls: 'chain',
      num: '02',
      stroke: '#ffd98a',
      kicker: 'Value',
      h3: 'Trust, made native.',
      body: 'Wallets, attestations, and proof-of-presence as defaults — not bolt-ons. On-chain where it matters, private by design everywhere else.',
      feats: ['Embedded wallets', 'EAS attestations', 'ZK + ICP privacy'],
    },
    {
      cls: 'life',
      num: '03',
      stroke: '#6ef0b8',
      kicker: 'Life',
      h3: 'Real Value Based on Life.',
      body: 'A new economic primitive. Value anchored to living systems and real-world regeneration — so the network grows richer precisely when the world grows healthier.',
      feats: ['RVBL ledger', 'Regenerative incentives', 'Proof-of-presence XP'],
    },
  ],
}

export const FLOWME = {
  tag: 'FlowMe OS · The Intelligence Layer',
  list: [
    { ic: 'REASON', body: 'Structured intelligence. Turn raw signals — missions, check-ins, content — into decisions and on-chain actions.' },
    { ic: 'SEE', body: 'Vision built in. From garden health to product imagery, FlowMe reads the real world and responds.' },
    { ic: 'ACT', body: 'Agentic by default. Bots, workflows, and assistants that operate across every connected app on one identity.' },
  ],
  terminal: [
    { c: 'u', t: '> flowme: who is this user, and what should we do?' },
    { c: 'a', t: '✦ FlowMe OS' },
    { c: 'm', t: '  Reading FBID 0x7c…a3f across 3 connected apps…' },
    { c: 'v', t: '  Identity: verified · Presence: 14 real-world check-ins' },
    { c: 'v', t: '  Value: 2,140 RVBL · regenerative streak active' },
    { c: 'a', t: '  → Issue attestation, unlock Builder tier, mint presence proof.' },
    { c: 'm', t: '  Done. One identity. Every app. In service of life.' },
  ],
}

export const LAYER0 = {
  lead: 'Consumer apps connect once and inherit a complete identity stack: a single FlowBond ID that travels across every product, every wallet, every chain — while your users only ever see your brand.',
  cells: [
    { ic: 'FBID', h4: 'Sovereign identity', p: 'One root identity, infinite app connections. Users own it; you build on it.' },
    { ic: 'WALLET', h4: 'Wallets, abstracted', p: 'Embedded, multi-chain wallets that appear the moment a user arrives — no seed-phrase friction.' },
    { ic: 'PRIVACY', h4: 'Zero-knowledge by design', p: 'Nullifier-based privacy, client-side encryption, and a ZK + ICP roadmap at the root.' },
    { ic: 'ONBOARD', h4: 'Drop-in onboarding', p: 'Magic-link → wallet → attestation in one SDK. Plug in, ship, regenerate.' },
  ],
}

export const SERVICES = {
  tag: 'What We Build',
  products: [
    { tag: 'CORE', h4: 'FBID — Layer 0 Identity', p: 'Sovereign, portable identity that anchors every app, wallet, and attestation.' },
    { tag: 'AI', h4: 'FlowMe OS', p: 'Claude-powered agentic intelligence woven through the stack — reason, see, act.' },
    { tag: 'SDK', h4: 'FlowBond SDK', p: 'One drop-in: auth, embedded wallets, onboarding, and attestations. CJS + ESM + types.' },
    { tag: 'PRIVACY', h4: 'Privacy Layer', p: 'Zero-knowledge identity and value with a ZK + ICP roadmap, private by design.' },
    { tag: 'VALUE', h4: 'RVBL Ledger', p: 'Real Value Based on Life — append-only XP and value ledgers tied to regeneration.' },
  ],
  services: [
    { tag: 'BUILD', h4: 'Done-for-you product builds', p: 'Full Next.js products shipped on the FlowBond stack — the proven client pattern, end to end.' },
    { tag: 'INTEGRATE', h4: 'Integration & migration', p: 'Drop FlowBond into existing apps, or migrate identity and wallets onto Layer 0.' },
    { tag: 'DESIGN', h4: 'Brand & experience', p: 'Bilingual, conversion-grade web experiences with identity baked into the design.' },
    { tag: 'ADVISE', h4: 'Web3 & ReFi advisory', p: 'Tokenomics, regenerative models, and go-to-market from a builder who has shipped them.' },
    { tag: 'ACTIVATE', h4: 'Ecosystem activation', p: 'Real-world presence, events, and community to launch products that live offline too.' },
  ],
}

export const FOUNDER = {
  tag: 'The Founder',
  role: 'Founder & Ecosystem Builder',
  name: 'Steph Ferrera',
  photoCaption: 'Steph Ferrera · Founder & Ecosystem Builder',
  paras: [
    'Steph began the way most founders do — with cofounders and alliances. But the partnerships couldn’t keep pace with what she was discovering in herself: that she is not only a visionary, but an ecosystem builder — able to architect and ship the whole stack, not just imagine it.',
    'Across years she has launched a constellation of work — consumer apps, cultural networks, regenerative economies, and the identity infrastructure beneath them — while building and backing digital-art and NFT collections and producing festivals and immersive experiences that move thousands. She ships her own dreams and helps others ship theirs, extending now into luxury holistic wearables and privacy-first hardware: devices engineered to give you what you need from technology, with as little of its harm as possible.',
    'Her method is the one FlowBond is built on — read the whole system, trace every pattern to its highest expression, then build the tools that let people embody it. Technology, mastered in service of life.',
  ],
  quote:
    '“My life’s work is to get the right tools into the right hands — and through them, place something lasting in service of the whole world.”',
  quoteSrc: 'Steph Ferrera · Founder, FlowBond',
  facets: [
    { fi: 'BUILD', p: 'Ecosystem architecture. Full-stack shipping, from protocol to product.' },
    { fi: 'ART', p: 'Digital art & NFTs. Building and backing collections — taken to the moon.' },
    { fi: 'PRODUCE', p: 'Experience production. Festivals and immersive worlds that move thousands.' },
    { fi: 'NETWORK', p: 'A rare inner circle. High-level founders, artists, and culture-shapers.' },
  ],
  tags: ['Founder · FlowBond', 'Ecosystem Builder', 'NFT & Digital Art', 'Experience Production', 'Holistic Wearables'],
}

export const ENGINE = {
  tag: 'The Engine',
  cards: [
    { n: '01 · FOUNDER', h4: 'Steph Ferrera', p: 'Vision, architecture, and direction. The majority holder steering FlowBond’s mission.' },
    { n: '02 · COLLABORATORS', h4: 'The build network', p: 'A network of builders and projects across LATAM starting the engine together, project by project.' },
    { n: '03 · ADVISORS', h4: 'Advisory board', p: 'Forming now — equity-aligned advisors across identity, ReFi, AI, and go-to-market.' },
    { n: '04 · INVESTORS', h4: 'Mission-aligned capital', p: 'Open to partners who back regenerative infrastructure for the long arc, not the quick exit.' },
  ],
}

export const RVBL = {
  tag: 'Real Value Based on Life',
  body: 'Most systems reward extraction. RVBL rewards regeneration. Presence in the real world, care for living systems, and contribution to community become the units of account — a value model where the healthiest networks are, quite literally, the most valuable.',
  stats: [
    { n: 'Layer 0', l: 'Identity & value root' },
    { n: '18+', l: 'Downstream systems' },
    { n: '∞', l: 'Apps on one ID' },
  ],
}

export const FINAL = {
  body: 'If you can imagine it, you can program it. We built the layer that lets you ship it — sovereign, regenerative, alive.',
  cta: 'Request access',
  placeholder: 'you@yourproject.com',
}

export const FOOTER = {
  brandBlurb: 'The Layer 0 of Life. Identity, value, and intelligence in service of a regenerative internet.',
  credit: '“If you can imagine it, you can program it”',
  creditName: 'V. Creativo',
  cols: [
    {
      h5: 'Build',
      links: [
        { label: 'Documentation', href: LINKS.docs },
        { label: 'Products', href: '#services' },
        { label: 'Deck ↗', href: LINKS.deck },
      ],
    },
    {
      h5: 'System',
      links: [
        { label: 'Intelligence', href: '#trinity' },
        { label: 'FlowMe OS', href: '#flowme' },
        { label: 'Layer 0', href: '#layer0' },
        { label: 'RVBL', href: '#rvbl' },
      ],
    },
    {
      h5: 'Company',
      links: [
        { label: 'Founder', href: '#founder' },
        { label: 'Contact', href: '#contact' },
        { label: 'Privacy', href: '#' },
      ],
    },
  ],
  copyright: '© 2026 FlowBond Tech Inc. · flowbond.life',
  tagline: 'In service of life ◇',
}
