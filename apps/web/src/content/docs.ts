// /docs — the documentation set.
//
// HONESTY RULE for this file: @flowbond/sdk is `private: true`, version 0.0.1,
// and is NOT on npm. Nothing here may tell a reader to install it. The platform
// pages describe how the system works and how an integration is delivered; they
// do not fake a public package that anyone could disprove in ten seconds.

export type Block =
  | { t: 'p'; c: string }
  | { t: 'h'; c: string }
  | { t: 'ul'; c: string[] }
  | { t: 'note'; c: string }
  | { t: 'steps'; c: { h: string; p: string }[] }
  | { t: 'table'; head: string[]; rows: string[][] }

export type DocPage = {
  slug: string
  title: string
  summary: string
  group: string
  blocks: Block[]
}

export const GROUPS = ['Start here', 'For clients', 'The platform', 'Trust'] as const

export const DOCS: DocPage[] = [
  // ───────────────────────────────────────────────────────────── Start here ──
  {
    slug: 'overview',
    title: 'What FlowBond is',
    summary: 'A software studio and platform company. What we build, who it is for, and how these docs are organised.',
    group: 'Start here',
    blocks: [
      { t: 'p', c: 'FlowBond builds and runs software for businesses — websites, platforms, and apps — and operates a small family of its own products on the same foundation. If you are a client of ours, or evaluating becoming one, these pages explain how we work and what you get.' },
      { t: 'h', c: 'Who this is for' },
      { t: 'ul', c: [
        'Business owners who need a real product built, launched, and looked after.',
        'Operations teams who will use the admin side of something we built.',
        'Technical people evaluating the foundation before their company commits to it.',
      ]},
      { t: 'h', c: 'How these docs are organised' },
      { t: 'steps', c: [
        { h: 'For clients', p: 'How a project actually runs, what you own at the end, how billing works, and how to get help.' },
        { h: 'The platform', p: 'How identity, payments, rewards, and intelligence work underneath every product we ship.' },
        { h: 'Trust', p: 'Security practices, sub-processors, availability, and where to report a problem.' },
      ]},
      { t: 'note', c: 'If something here is unclear or looks wrong, tell us at hello@flowbond.life. Documentation that quietly drifts out of date is worse than none.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── For clients ──
  {
    slug: 'how-a-project-runs',
    title: 'How a project runs',
    summary: 'From first conversation to live site, and what is expected of you at each step.',
    group: 'For clients',
    blocks: [
      { t: 'p', c: 'Every project follows the same four steps. You know the price and the delivery date before any building starts.' },
      { t: 'steps', c: [
        { h: '1 · We talk', p: 'One conversation about what your business does and where it is losing time or money. No charge, and you leave with an honest opinion whether or not you hire us — including if the answer is that you do not need what you came to ask for.' },
        { h: '2 · You get a plan', p: 'Scope, price, and a delivery date in writing. Fixed price for defined work. If a project is large, it is split into phases so something real is live early instead of everything arriving at the end.' },
        { h: '3 · We build it', p: 'You watch it go up on a real link you can open at any time. You approve what ships. Changes inside the agreed scope are simply part of the work; changes outside it get quoted before they happen, never after.' },
        { h: '4 · We run it', p: 'It goes live on your domain. From there a care plan covers hosting, security, backups, and ongoing changes.' },
      ]},
      { t: 'h', c: 'What we need from you' },
      { t: 'ul', c: [
        'One decision-maker who can approve things. Projects stall on committees, not on code.',
        'Your real content — prices, services, photos — or a decision to have us write and source it.',
        'Access to your domain, or permission for us to buy and manage it for you.',
        'Prompt answers on the few questions that block progress. We will make it obvious which ones those are.',
      ]},
      { t: 'note', c: 'We do not start a build before the plan is agreed in writing. It protects you more than it protects us.' },
    ],
  },
  {
    slug: 'what-you-own',
    title: 'What you own',
    summary: 'The code, the design, the domain, and the data are yours. How handover works if you leave.',
    group: 'For clients',
    blocks: [
      { t: 'p', c: 'You own what we build for you. That is not a courtesy — it is the arrangement, and it is written into our terms.' },
      { t: 'table', head: ['Thing', 'Who owns it', 'Notes'], rows: [
        ['The code we wrote for you', 'You', 'Handed over on request, in full.'],
        ['Your design and content', 'You', 'Including anything we wrote or produced for the project.'],
        ['Your domain', 'You', 'Registered in your name where possible, transferred on request.'],
        ['Your data and your customers', 'You', 'Exportable at any time, in a usable format.'],
        ['Our shared foundation', 'FlowBond', 'Licensed to you for as long as you use it. It is the reason your build took weeks and not a year.'],
      ]},
      { t: 'h', c: 'If you leave' },
      { t: 'p', c: 'You keep everything in the table above. We hand over the code, the accounts, and the data, and we help whoever picks it up next get oriented. Nothing is built in a way designed to trap you, and asking for a handover is a normal request rather than a difficult conversation.' },
      { t: 'note', c: 'Businesses we have handed over completely stay handed over. Once a transfer is finished, we do not retain administrative access to your systems.' },
    ],
  },
  {
    slug: 'billing',
    title: 'Billing',
    summary: 'What you are charged for, when, by whom, and what happens if you cancel.',
    group: 'For clients',
    blocks: [
      { t: 'p', c: 'There are three ways money changes hands with us, and none of them is an hourly meter running in the background.' },
      { t: 'table', head: ['Type', 'How it is billed', 'Cancellation'], rows: [
        ['Fixed-price project', 'A deposit to begin, the balance on delivery. Larger builds are billed per phase.', 'Before a phase starts, for anything not yet begun.'],
        ['Care plan', 'Monthly or annually in advance.', 'At the end of any term.'],
        ['Product subscription', 'Monthly or annually in advance, per business.', 'At the end of any term.'],
        ['Advisory retainer', 'Monthly in advance.', 'At the end of any term.'],
      ]},
      { t: 'h', c: 'Who processes the payment' },
      { t: 'p', c: 'Our invoices are processed by Stripe. FlowBond never sees or stores your full card number.' },
      { t: 'h', c: 'Your own customers’ payments' },
      { t: 'p', c: 'Where we build something that takes money from your customers, that is a separate arrangement from what you pay us. You are the merchant of record for your own sales: the money is yours, it settles to your account, and the processor’s fees are paid by you directly to the processor.' },
      { t: 'note', c: 'FlowBond is not a bank, a money transmitter, or an exchange. We build the software; licensed providers move the money.' },
      { t: 'h', c: 'Taxes' },
      { t: 'p', c: 'Prices are quoted exclusive of tax. Any applicable tax is added to the invoice and shown separately.' },
    ],
  },
  {
    slug: 'support',
    title: 'Getting help',
    summary: 'Where to write, what to include, and how quickly you will hear back.',
    group: 'For clients',
    blocks: [
      { t: 'p', c: 'Write to support@flowbond.life. We respond to support requests within two business days, and faster when something is actually down.' },
      { t: 'h', c: 'What to include' },
      { t: 'ul', c: [
        'The link to the page where it happened.',
        'What you expected, and what happened instead.',
        'Roughly when it started, and whether it happens every time.',
        'A screenshot if there is anything visible to photograph.',
      ]},
      { t: 'h', c: 'Where to write' },
      { t: 'table', head: ['Subject', 'Address'], rows: [
        ['Something is broken', 'support@flowbond.life'],
        ['A change or a new project', 'hello@flowbond.life'],
        ['A privacy or data request', 'privacy@flowbond.life'],
        ['A security problem', 'security@flowbond.life'],
        ['Contracts and legal', 'legal@flowbond.life'],
      ]},
      { t: 'note', c: 'If you believe you have found a security vulnerability, write to security@flowbond.life directly rather than raising it in a public channel. We will confirm receipt and keep you updated.' },
    ],
  },

  // ────────────────────────────────────────────────────────── The platform ──
  {
    slug: 'identity',
    title: 'Identity — one account across your products',
    summary: 'How a single sign-in works across everything you own, and what it means for your customers.',
    group: 'The platform',
    blocks: [
      { t: 'p', c: 'Every product we build shares one identity system. A person signs in once and is recognised across every product you own — and, if they choose, across other products built on the same foundation.' },
      { t: 'h', c: 'How someone signs in' },
      { t: 'ul', c: [
        'A link sent to their email address.',
        'A one-time numeric code, for when links get mangled by a mail client.',
        'A connected wallet, where a product genuinely calls for one.',
      ]},
      { t: 'p', c: 'There is no password, because passwords are the single most common cause of a breach that was not otherwise going to happen.' },
      { t: 'h', c: 'What you get from it' },
      { t: 'ul', c: [
        'You do not pay to rebuild login for each new product.',
        'A customer who arrives through one of your products is already known in the next one.',
        'Roles and permissions are set per product, so being a customer in one place does not grant access in another.',
        'Rewards and history follow the person rather than the app.',
      ]},
      { t: 'note', c: 'Your customers are yours. Sharing an identity foundation does not mean sharing your customer list with anyone, including us or another client.' },
    ],
  },
  {
    slug: 'payments',
    title: 'Payments and payouts',
    summary: 'How money moves: local payment methods in, splits at the processor, payouts across borders.',
    group: 'The platform',
    blocks: [
      { t: 'p', c: 'Payments are the part of a platform most likely to quietly go wrong, so this page is specific about how ours are arranged.' },
      { t: 'h', c: 'Taking money' },
      { t: 'p', c: 'We wire up the payment methods your customers actually use where they live — cards, bank transfer, cash vouchers, and local wallets — rather than assuming everyone pays the way you do. You are the merchant of record for your own sales.' },
      { t: 'h', c: 'Splitting a sale between several parties' },
      { t: 'p', c: 'On a marketplace, a single payment usually belongs to more than one party — the seller, the platform, sometimes a referrer. We arrange for the payment provider to make that split at the moment of payment, so each side is paid directly and the money does not detour through an account we control.' },
      { t: 'p', c: 'The split percentages are enforced by database triggers rather than by application code. That means the seller’s share cannot be edited around by a bug, a bad deploy, or anyone with access to the admin panel.' },
      { t: 'note', c: 'Where a seller has not yet completed their payment onboarding, a sale may be held and settled manually against the commission ledger so the sale is not lost. We treat completing that onboarding as the thing to fix, not as a permanent arrangement.' },
      { t: 'h', c: 'Paying people out' },
      { t: 'p', c: 'Sellers choose how they receive money and in which currency. Conversions use verified rates — if we do not have a fresh rate, we pay in the original currency rather than invent a number.' },
      { t: 'h', c: 'The ledger' },
      { t: 'p', c: 'Every order, split, fee, and payout is written to an append-only ledger. Balances are reconstructable from history, so a seller can check what they are owed instead of taking anyone’s word for it.' },
      { t: 'note', c: 'FlowBond is not a bank, a money transmitter, or an exchange, and holds no private keys. Payments are processed by licensed providers.' },
    ],
  },
  {
    slug: 'rewards',
    title: 'Rewards and community',
    summary: 'Loyalty that pays out for real behaviour, with balances that cannot be quietly manufactured.',
    group: 'The platform',
    blocks: [
      { t: 'p', c: 'Points that only ever buy more points are a dead end. The rewards layer is built so that earning reflects something real and redemption is worth something real.' },
      { t: 'h', c: 'How earning works' },
      { t: 'ul', c: [
        'You define the actions that earn — a completed booking, a visit, a referral that actually converted, a contribution to your community.',
        'Earning events are recorded once and cannot be replayed to farm a balance.',
        'Balances are append-only: entries are added, never rewritten, so history always reconstructs the current number.',
      ]},
      { t: 'h', c: 'How redemption works' },
      { t: 'ul', c: [
        'Rewards redeem against real products, services, and access that you control.',
        'Redemption is checked against the reconstructed balance at the moment it is used.',
        'You set the rate. It is your economy, not ours.',
      ]},
      { t: 'h', c: 'Attestations' },
      { t: 'p', c: 'Where a fact needs to be provable to someone outside your system — that a person completed something, attended something, or was verified — it can be recorded as an attestation. Where an attestation is written to a public network, that record is permanent and outside anyone’s control, including ours. We only do it where permanence is the point.' },
    ],
  },
  {
    slug: 'intelligence',
    title: 'Intelligence',
    summary: 'Assistants that work from your real data, and the guardrails that keep them from inventing things.',
    group: 'The platform',
    blocks: [
      { t: 'p', c: 'Intelligence in our products is not a chat window bolted onto a finished site. It sits inside the product, with controlled access to the real state of your business.' },
      { t: 'h', c: 'What it does' },
      { t: 'ul', c: [
        'Answers customers, in the language they wrote in, from what is actually true in your system.',
        'Assists your team — drafting, summarising, sorting, and surfacing what was about to be missed.',
        'Watches quietly for the things worth noticing: an unusual transaction, stock that stopped moving, a booking that never got confirmed.',
      ]},
      { t: 'h', c: 'The guardrails' },
      { t: 'p', c: 'The most important design decision is what an assistant is not allowed to do. Where an answer would create an obligation you then have to honour — a price, an availability, a commitment — the system requires a published value and refuses to estimate. An assistant that invents a price has not saved you work; it has sold something at a number you never agreed to.' },
      { t: 'ul', c: [
        'Responses are grounded in your records, reached through defined interfaces rather than free access.',
        'No published price means no quoted price — it falls back to a human.',
        'What an assistant may read and write is bounded by the same per-person access rules as everything else.',
        'Sensitive operations leave an audit record.',
      ]},
      { t: 'note', c: 'We do not use your data, or your customers’ data, to train models.' },
    ],
  },
  {
    slug: 'integrating',
    title: 'Integrating with FlowBond',
    summary: 'What is available today for teams who want to build on the foundation themselves.',
    group: 'The platform',
    blocks: [
      { t: 'p', c: 'Most of our clients do not integrate anything themselves — we build the product and hand it over. This page is for teams who have their own developers and want to build on the foundation directly.' },
      { t: 'h', c: 'What exists today' },
      { t: 'p', c: 'The identity, payments, and rewards layers are delivered as part of a build, along with the source, the schema, and documentation specific to your system. Your developers get full access to what runs your product.' },
      { t: 'note', c: 'To be straight with you: there is no public SDK you can install from a package registry today. The client library exists and is used across our own products, but it is not published, and we would rather say so than let you discover it after signing something. If a self-serve integration is what you need, tell us — it changes what we would recommend.' },
      { t: 'h', c: 'How an integration is delivered' },
      { t: 'steps', c: [
        { h: 'Scoping', p: 'We work out which parts you actually need. Identity alone is a very different project from identity plus payments plus rewards.' },
        { h: 'Provisioning', p: 'Your environment, your database, your keys. Scoped credentials, nothing shared with another client.' },
        { h: 'Handover', p: 'Source, schema, environment documentation, and a working session with your developers.' },
        { h: 'Support', p: 'A care plan covering the integration, or a clean exit if you would rather run it entirely yourselves.' },
      ]},
    ],
  },

  // ───────────────────────────────────────────────────────────────── Trust ──
  {
    slug: 'trust',
    title: 'Trust, security, and sub-processors',
    summary: 'Our security practices, who we share data with, and how to report a problem.',
    group: 'Trust',
    blocks: [
      { t: 'p', c: 'This page is the short, checkable version. The full legal positions are in the Privacy Policy and the Terms of Service.' },
      { t: 'h', c: 'Security practices' },
      { t: 'ul', c: [
        'Access is checked at the database on every table, per person — not in application code that a bug could route around.',
        'Encryption in transit on every connection, and encryption at rest for everything stored.',
        'Credentials are scoped, revocable, and never embedded in anything that runs in a browser.',
        'Sensitive operations write to append-only audit trails that cannot be quietly edited afterwards.',
        'Least-privilege access, with production access reviewed rather than assumed.',
        'Changes to systems we operate require two of three people to approve before they ship.',
        'Wallet features are non-custodial: we hold no private keys and no seed phrases.',
      ]},
      { t: 'h', c: 'Sub-processors' },
      { t: 'p', c: 'These are the third parties that may process data on our behalf. Each is bound by a written agreement limiting use of the data to providing services to us.' },
      { t: 'table', head: ['Provider', 'Purpose', 'Data location'], rows: [
        ['Cloudflare, Inc.', 'Hosting, CDN, DNS, protection, email routing', 'Global edge'],
        ['Supabase, Inc.', 'Application database and authentication', 'United States'],
        ['Stripe, Inc.', 'Payment processing and subscription billing', 'United States'],
        ['Vercel, Inc.', 'Application hosting for certain products', 'United States'],
        ['Anthropic PBC', 'Intelligence features', 'United States'],
        ['Resend, Inc.', 'Transactional email delivery', 'United States'],
        ['Mercado Pago', 'Payment processing in Latin American markets', 'Latin America'],
      ]},
      { t: 'note', c: 'This list is maintained as the systems change. If a provider you care about is missing, ask us — an incomplete sub-processor list is the most common defect in a privacy programme and we would rather correct it than defend it.' },
      { t: 'h', c: 'Availability' },
      { t: 'p', c: 'Products are deployed to a global edge network with automatic certificate management. We aim for high availability and monitor continuously, but we do not claim a guaranteed uptime figure unless a written service level agreement is in place for your account. We would rather under-promise here than publish a number we cannot honour.' },
      { t: 'h', c: 'Reporting a problem' },
      { t: 'p', c: 'Security issues go to security@flowbond.life. Privacy requests go to privacy@flowbond.life. If you are an end user of a product built on FlowBond, contact that product’s operator first — they control your data and we act on their instructions.' },
    ],
  },
]

export const DOC_INDEX = GROUPS.map((g) => ({
  group: g,
  pages: DOCS.filter((d) => d.group === g),
}))
