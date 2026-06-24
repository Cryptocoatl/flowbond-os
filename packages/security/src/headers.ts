// ════════════════════════════════════════════════════════════════════════
//  @flowbond/security · headers  — FloGuard FG-030
//
//  The single source of truth for HTTP security headers across every FlowBond
//  app. No app shipped these before (clickjacking on the claudiaflow.life vault,
//  x-powered-by leak on flowme.one). Promote once, wire everywhere.
//
//  Defaults are strict-but-portable. Per-app CSP needs differ (WebGL / wasm /
//  embeds), so CSP is opt-in via `csp` — pass `false` to omit it, a string to
//  set it verbatim, or use one of the presets below.
// ════════════════════════════════════════════════════════════════════════

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface SecurityHeadersOptions {
  /** Content-Security-Policy. `undefined`/`true` → strict default; a string → verbatim; `false` → omit. */
  csp?: string | boolean;
  /** X-Frame-Options. Default 'DENY'. Pass false to omit (use only if a page must be embeddable). */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  /** Strict-Transport-Security. Default: 2yr + subdomains + preload. Pass false to omit. */
  hsts?: string | boolean;
  /** Referrer-Policy. Default 'strict-origin-when-cross-origin'. */
  referrerPolicy?: string;
  /** Permissions-Policy. Default locks camera/mic/geolocation. Pass false to omit. */
  permissionsPolicy?: string | false;
}

const STRICT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

/**
 * CSP presets for common app shapes. Use as the `csp` option, or compose your own.
 * - `webgl`: allows wasm-eval + blob workers (claudia/flow3/reciprociudad water).
 */
export const CSP_PRESETS = {
  strict: STRICT_CSP,
  webgl: STRICT_CSP
    .replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval' blob:")
    .replace("connect-src 'self' https:", "connect-src 'self' https: wss: blob:")
    .replace("worker-src 'none'", '') // no-op if absent
    + "; worker-src 'self' blob:",
} as const;

const DEFAULT_HSTS = 'max-age=63072000; includeSubDomains; preload';
const DEFAULT_PERMISSIONS = 'camera=(), microphone=(), geolocation=(), browsing-topics=()';

/**
 * Build the canonical security-header set. Returns an array of {key,value}
 * suitable for Next.js `headers()`, middleware, or any framework.
 */
export function securityHeaders(opts: SecurityHeadersOptions = {}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: opts.referrerPolicy ?? 'strict-origin-when-cross-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ];

  if (opts.frameOptions !== false) {
    headers.push({ key: 'X-Frame-Options', value: opts.frameOptions ?? 'DENY' });
  }

  if (opts.hsts !== false) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: typeof opts.hsts === 'string' ? opts.hsts : DEFAULT_HSTS,
    });
  }

  if (opts.permissionsPolicy !== false) {
    headers.push({
      key: 'Permissions-Policy',
      value: typeof opts.permissionsPolicy === 'string' ? opts.permissionsPolicy : DEFAULT_PERMISSIONS,
    });
  }

  if (opts.csp !== false) {
    const value = typeof opts.csp === 'string' ? opts.csp : STRICT_CSP;
    headers.push({ key: 'Content-Security-Policy', value });
  }

  return headers;
}
