// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · plan ↔ tier config  (lib/safeflow/plans.ts)  — server-only
//
//  Plug in your Stripe price IDs via env and the billing loop is wired:
//    STRIPE_PRICE_PLUS / STRIPE_PRICE_PRO  → which price grants which tier.
//  checkout creates a session for the chosen tier's price; the webhook reverses
//  the mapping (price → tier) to set the entitlement.
// ════════════════════════════════════════════════════════════════════════

import type { Tier } from '../claudia/tiers';

export type PaidTier = Exclude<Tier, 'free'>;

/** Stripe price id for each paid tier (set in env). */
export const STRIPE_PRICE: Record<PaidTier, string> = {
  plus: process.env.STRIPE_PRICE_PLUS || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
};

/** Reverse map: a Stripe price id → the tier it grants (null if unknown). */
export function tierForPrice(priceId: string | undefined | null): Tier | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICE.pro) return 'pro';
  if (priceId === STRIPE_PRICE.plus) return 'plus';
  return null;
}

/** Map a Stripe subscription status to whether the tier should stay active. */
export function isActiveStatus(status: string | undefined | null): boolean {
  return status === 'active' || status === 'trialing';
}
