// /services — what we sell and how we charge for it.
//
// NOTE FOR THE NEXT EDIT: there are deliberately no hard prices here. Publishing
// a number FlowBond would then have to honour is worse than publishing none, and
// no real price list exists yet. Every engagement says how it is priced and when
// you learn the number. When Steph sets real bands, drop them into `priceNote`.

export const OFFERINGS = [
  {
    tag: 'BUILD',
    h4: 'Websites',
    p: 'The site your business is judged by. Written, designed, and built for the people you actually want to reach — fast anywhere, correct on a phone, and yours outright.',
    includes: ['Copy and design', 'Built and deployed on your domain', 'Enquiry or booking capture', 'Analytics and search basics'],
    priceNote: 'Fixed price, quoted in writing before we start.',
    accent: 'ai' as const,
  },
  {
    tag: 'BUILD',
    h4: 'Platforms & marketplaces',
    p: 'When more than one party transacts — sellers, operators, practitioners, venues — and the money has to reach each of them correctly, every time.',
    includes: ['Multi-party accounts and roles', 'Payments and revenue splits', 'Booking, inventory, or catalogue', 'An operations console for your team'],
    priceNote: 'Fixed price per phase, so you are never buying the whole thing blind.',
    accent: 'chain' as const,
  },
  {
    tag: 'BUILD',
    h4: 'Apps',
    p: 'Web and installable mobile apps on the same foundation — one account, one set of data, one place to look after it.',
    includes: ['Installs to the home screen', 'Works on a bad connection', 'Push and notifications', 'Same login as your other products'],
    priceNote: 'Fixed price, quoted in writing before we start.',
    accent: 'life' as const,
  },
  {
    tag: 'RUN',
    h4: 'Care plans',
    p: 'Everything after launch. Hosting, domains, certificates, backups, security updates, and a person who answers when something is wrong.',
    includes: ['Hosting and domain management', 'Backups and monitoring', 'Security patching', 'A monthly allowance of changes'],
    priceNote: 'Monthly subscription, cancel at the end of any term.',
    accent: 'chain' as const,
  },
  {
    tag: 'GROW',
    h4: 'Intelligence',
    p: 'Added to a product you already have, or built into a new one. It answers customers, assists your team, and keeps an eye on what looks wrong — always from your real data.',
    includes: ['Customer-facing assistant', 'Admin and drafting help', 'Anomaly and fraud checks', 'Grounded in your own records'],
    priceNote: 'Project fee to build, then monthly as part of a care plan.',
    accent: 'ai' as const,
  },
  {
    tag: 'GROW',
    h4: 'Payments & payouts',
    p: 'Take money from customers in other countries, and get it to whoever earned it. We integrate licensed providers and wire the splits correctly.',
    includes: ['Local payment methods', 'Revenue splits at the processor', 'Cross-border payouts', 'An auditable ledger'],
    priceNote: 'Project fee. Processor fees are paid by you, directly to the processor.',
    accent: 'chain' as const,
  },
  {
    tag: 'GROW',
    h4: 'Rewards & community',
    p: 'A loyalty and rewards layer that pays out for real behaviour, shared across every product you own, with balances that cannot be quietly manufactured.',
    includes: ['One account across your products', 'Earning rules you control', 'Redemption against real value', 'Append-only balances'],
    priceNote: 'Project fee to build, then monthly as part of a care plan.',
    accent: 'life' as const,
  },
  {
    tag: 'PLATFORM',
    h4: 'FlowOps and our own products',
    p: 'Software we built, run, and sell by subscription — starting with point of sale, inventory, and fraud checks for businesses with more than one location.',
    includes: ['Multi-location and multi-user', 'Inventory and stock control', 'Fraud and anomaly checks', 'Handover if you ever leave'],
    priceNote: 'Monthly subscription per business.',
    accent: 'ai' as const,
  },
]

export const ENGAGEMENT = {
  tag: 'How we charge',
  lead: 'Three ways money changes hands, and none of them is an hourly meter.',
  models: [
    {
      n: '01',
      h4: 'Fixed-price projects',
      p: 'A defined build for a defined number. You approve the scope and the price before anything starts, and the number does not move unless you ask for something that was not in it.',
    },
    {
      n: '02',
      h4: 'Monthly subscriptions',
      p: 'Care plans for software we look after, and per-business subscriptions for our own products. Billed monthly or annually in advance, cancellable at the end of any term.',
    },
    {
      n: '03',
      h4: 'Advisory',
      p: 'A retainer when you want the thinking rather than the building — architecture, payment strategy, or a second opinion on something you are about to commit to.',
    },
  ],
  note:
    'Payments are processed by Stripe. Where a project involves your customers paying you, you are the merchant of record for those sales — the money is yours and it goes to your account, not ours.',
}

export const FAQ = [
  {
    q: 'Do I own what you build?',
    a: 'Yes. The code, the design, the domain, and the data are yours. If you ever want to take it somewhere else, we hand it over — that is a normal request, not a difficult conversation.',
  },
  {
    q: 'How long does a project take?',
    a: 'A website is usually weeks. A platform with payments and multiple parties is usually months, delivered in phases so something real is live early rather than everything landing at the end.',
  },
  {
    q: 'What does it cost?',
    a: 'It depends on what it is, and you find out before you commit. One conversation is normally enough for us to put scope, price, and a delivery date in writing.',
  },
  {
    q: 'Do you hold my money?',
    a: 'No. Payments run through licensed providers and you are the merchant of record for your own sales. Where a platform splits revenue between several parties, the split happens at the payment provider so each side is paid directly.',
  },
  {
    q: 'What happens if I stop working with you?',
    a: 'You keep everything. We hand over the code, the accounts, and the data, and we help the next person pick it up. Nothing is built in a way that traps you.',
  },
  {
    q: 'Do you work in English and Spanish?',
    a: 'Both, natively. Most of what we build ships bilingual because most of our clients sell across a border.',
  },
]
