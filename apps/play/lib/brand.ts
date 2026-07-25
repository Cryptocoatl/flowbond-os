// =============================================================================
// brand.ts — THE ONLY place product/brand strings live.
// Final consumer branding is pending Love's decision. Infra identifiers (app
// name, env vars, Cloudflare project, DB tables) stay neutral ("play"); only
// user-facing copy is resolved here so a rename is a one-file change.
// =============================================================================

export const brand = {
  /** user-facing product name — provisional, swap on Love's call */
  productName: 'Kai World',
  tagline: 'One heart, one beat, one bit.',
  /** the promise, in one line */
  promise: 'Earth in the future tense — a living mirror that heals when you do.',
  domain: 'play.flowbond.life',
  /** default region a bare visit lands on */
  defaultRegionSlug: 'valle-espejo',
} as const;

export type Brand = typeof brand;
