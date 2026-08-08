// /technology — the depth page for technical buyers. Everything claimed here is
// either shipping today or explicitly marked as roadmap. Zero-knowledge work is
// stubs, not production: it appears under ROADMAP and nowhere else.

export const TECH_INTRO = {
  h2: 'The same foundation under every product we ship.',
  body: 'We do not start from zero for each client, and we do not hand anyone a pile of parts. There is one foundation — identity, data, payments, intelligence, and a rewards ledger — and each product is that foundation shaped to a business. It is why a build takes weeks instead of a year, and why the second product for the same client costs a fraction of the first.',
}

export const STACK = [
  {
    ic: 'IDENTITY',
    h4: 'One account across everything',
    p: 'A single identity — we call it FBID — that a person carries across every product you own. They sign in once with an email link or a one-time code. No password to leak, no separate login to rebuild for each app.',
    detail: 'Email link · one-time code · optional wallet · roles and permissions per product',
  },
  {
    ic: 'DATA',
    h4: 'Postgres, with access checked per person',
    p: 'Every table enforces who may read and write each row at the database itself, not in application code that a bug could route around. A mistake in a page cannot leak another tenant’s data.',
    detail: 'Row-level security on every table · scoped keys · no secrets in the browser',
  },
  {
    ic: 'MONEY',
    h4: 'Payments through licensed providers',
    p: 'Cards, local methods, and payout rails, wired so the people in a transaction are paid directly by the processor. Splits and commissions are enforced by database triggers, which means they cannot be edited around.',
    detail: 'Stripe · local processors · splits enforced in the database · append-only ledger',
  },
  {
    ic: 'MIND',
    h4: 'Intelligence with its hands on real data',
    p: 'Assistants that read the actual state of your business through controlled interfaces, so they answer from your prices and your inventory rather than from a plausible guess. Where an answer would create an obligation, the system requires a published number.',
    detail: 'Grounded responses · structured tool access · no invented prices',
  },
  {
    ic: 'REWARDS',
    h4: 'An append-only value ledger',
    p: 'Rewards, points, and attestations are recorded in ledgers that can be added to but never rewritten. Balances are reconstructable from history, so nobody has to trust a number — they can check it.',
    detail: 'Append-only · reconstructable balances · on-chain attestation where it earns its place',
  },
  {
    ic: 'EDGE',
    h4: 'Served from close to your customer',
    p: 'Deployed to a global edge network, so a page opens as fast in Cancún as in Madrid. Static where it can be, dynamic where it must be.',
    detail: 'Global edge deploys · automatic certificates · your domain',
  },
]

export const SECURITY = {
  tag: 'Security',
  h2: 'Built to fail safe, not to look safe.',
  points: [
    { h4: 'Access checked at the database', p: 'Row-level security on every table. An application bug cannot become a data breach, because the database refuses the read regardless of what the code asked for.' },
    { h4: 'Encrypted everywhere', p: 'TLS in transit on every connection, encryption at rest for everything stored.' },
    { h4: 'Keys that are scoped and revocable', p: 'Nothing sensitive is ever embedded in a browser. Credentials are narrow, replaceable, and rotated.' },
    { h4: 'Append-only audit trails', p: 'Sensitive operations write a record that cannot be quietly edited afterwards. If something happened, there is evidence of it.' },
    { h4: 'Approval before anything changes', p: 'Changes to the systems we run pass through an approval desk requiring two of three people to agree. Nobody, including us, ships to your production alone.' },
    { h4: 'No custody of keys', p: 'Where a product involves a wallet, it is non-custodial. We hold no private keys and no seed phrases, so there is nothing of yours for us to lose.' },
  ],
}

export const ROADMAP = {
  tag: 'Roadmap — not shipping yet',
  lead: 'Listed here so it is clear what is real today and what is not. None of the following is in production, and we will not sell it to you as though it were.',
  items: [
    { h4: 'Zero-knowledge identity proofs', p: 'Proving a fact about a person — old enough, verified, a member — without revealing the record behind it. Design and stubs exist; production does not.' },
    { h4: 'Decentralised compute', p: 'Moving parts of the identity root onto infrastructure no single company operates, including us. Researched, not built.' },
    { h4: 'Privacy-first hardware', p: 'Devices that give you what you need from technology with as little of its harm as possible. Early.' },
  ],
}

export const LAYER0 = {
  tag: 'The longer arc',
  h2: 'Why any of this is shaped the way it is.',
  body: 'For two decades the internet learned to harvest attention, identity, and trust, then sell them back to us. FlowBond is built the other way around: identity belongs to the person, value is recorded where it cannot be quietly rewritten, and intelligence works for the person using it rather than on them.',
  bodyB: 'In practice that shows up as ordinary engineering decisions — access checked per person, ledgers that only append, no custody of anything we do not need to hold, and a handover process that assumes you might one day leave. A business does not have to care about the philosophy to benefit from it. It is simply why the software behaves well when things go wrong.',
}
