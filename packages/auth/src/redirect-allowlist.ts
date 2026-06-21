// Single source of truth for where the FBID hub is allowed to send a user
// (and the auth token_hash) back to. SECURITY-CRITICAL: validated by EXACT
// origin + pathname match — never a substring/startsWith check, which would let
// `https://flowbond.life.evil.com` through.

export interface AllowedCallback {
  origin: string
  path: string
}

export const ALLOWED_CALLBACKS: readonly AllowedCallback[] = Object.freeze([
  // ---- production ----
  { origin: 'https://astro.flowbond.life', path: '/auth/callback' },
  { origin: 'https://flowgarden.life', path: '/auth/callback' },
  { origin: 'https://www.flowgarden.life', path: '/auth/callback' },
  { origin: 'https://flowbond.life', path: '/api/auth/callback' },
  { origin: 'https://danz-now.vercel.app', path: '/auth/callback' },
  { origin: 'https://deck.flowbond.life', path: '/auth/callback' },
  { origin: 'https://xelva.live', path: '/auth/callback' },
  { origin: 'https://dev.flowbond.life', path: '/auth/callback' }, // ops
  { origin: 'https://fbid.flowbond.life', path: '/auth/callback' }, // hub's own login (dashboard)
  { origin: 'https://studio.flowme.one', path: '/auth/callback' },    // flowstudio (canonical)
  { origin: 'https://flowstudio.flowme.one', path: '/auth/callback' }, // flowstudio (alias)
  { origin: 'https://v3.flowme.one', path: '/auth/callback' },        // flowstudio (legacy)
  { origin: 'https://flowme.one', path: '/auth/callback' },         // flowme profiles
  { origin: 'https://www.flowme.one', path: '/auth/callback' },
  { origin: 'https://claudia-flowbond.vercel.app', path: '/auth/callback' }, // claudia (La Guardiana)
  { origin: 'https://claudia-sable.vercel.app', path: '/auth/callback' },    // claudia (prod alias)
  { origin: 'https://claudiaflow.life', path: '/auth/callback' },            // claudia (custom domain)
  { origin: 'https://www.claudiaflow.life', path: '/auth/callback' },        // claudia (www)
  { origin: 'https://grants.claudiaflow.life', path: '/auth/callback' },     // grantflow (custom domain)
  { origin: 'https://claudia-grants.vercel.app', path: '/auth/callback' },   // grantflow (vercel)
  // ---- local development ----
  { origin: 'http://localhost:3011', path: '/auth/callback' },     // astroflow
  { origin: 'http://localhost:3020', path: '/auth/callback' },     // fbid hub itself
  { origin: 'http://localhost:3002', path: '/auth/callback' },     // flowgarden
  { origin: 'http://localhost:3000', path: '/api/auth/callback' }, // flowbond-life
  { origin: 'http://localhost:3003', path: '/auth/callback' },     // ops
  { origin: 'http://localhost:3030', path: '/auth/callback' },     // danz
  { origin: 'http://localhost:3013', path: '/auth/callback' },     // flow3
  { origin: 'http://localhost:3021', path: '/auth/callback' },     // claudia (La Guardiana)
  { origin: 'http://localhost:3000', path: '/auth/callback' },     // flowme profiles
  { origin: 'http://localhost:3012', path: '/auth/callback' },     // grantflow
])

/** True only if `raw` exactly matches an allowed (origin, pathname) pair. */
export function isAllowedRedirect(raw: string | null | undefined): boolean {
  if (!raw) return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  return ALLOWED_CALLBACKS.some(a => a.origin === u.origin && a.path === u.pathname)
}

/** Human-readable list (for Supabase redirect-allowlist config + debugging). */
export function allowedCallbackUrls(): string[] {
  return ALLOWED_CALLBACKS.map(a => a.origin + a.path)
}
