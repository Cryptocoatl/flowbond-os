// Pricing tiers — copy + amounts lifted verbatim from flowbond.html.
// NOTE: Builder ($149) and the $14 / $1,499 anchors are from the prototype/brief.
// ⚠ Confirm against the locked pricing sheet before launch (brief STOP point).

export type Tier = {
  name: string
  who: string
  /** Monthly price in USD, or null for the "Let's talk" custom tier. */
  monthly: number | null
  /** Annual price in USD (2 months free), or null for custom. */
  annual: number | null
  /** Shown instead of a number on the custom tier. */
  customLabel?: string
  perCustom?: string
  features: string[]
  cta: string
  featured?: boolean
}

export const TIERS: Tier[] = [
  {
    name: 'Starter',
    who: 'Indie builders & first apps',
    monthly: 14,
    annual: 140,
    features: ['1 app on FBID', 'Magic-link auth + embedded wallet', 'Basic attestations', 'Community support'],
    cta: 'Get started',
  },
  {
    name: 'Builder',
    who: 'Growing products & teams',
    monthly: 149,
    annual: 1490,
    features: ['Up to 3 apps', 'FlowMe OS access', 'Full attestations + analytics', 'Email support'],
    cta: 'Start building',
    featured: true,
  },
  {
    name: 'Scale',
    who: 'Production networks',
    monthly: 1499,
    annual: 14990,
    features: ['Unlimited apps', 'Full ZK privacy + RVBL ledger', 'Priority support + SLAs', 'Dedicated success'],
    cta: 'Talk to us',
  },
  {
    name: 'Custom',
    who: 'Bespoke builds & enterprise',
    monthly: null,
    annual: null,
    customLabel: "Let's talk",
    perCustom: 'dev packages',
    features: ['Done-for-you product builds', 'White-glove engineering', 'Custom contracts & entities', 'Advisory + activation'],
    cta: 'Book a call',
  },
]

export const PRICE_NOTE =
  'All plans include FBID, embedded wallets, and the FlowBond SDK. Annual billing saves two months. Prices in USD.'
