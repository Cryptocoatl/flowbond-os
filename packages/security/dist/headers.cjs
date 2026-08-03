'use strict';
Object.defineProperty(exports, '__esModule', { value: true });

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

const CSP_PRESETS = {
  strict: STRICT_CSP,
  webgl: STRICT_CSP
    .replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval' blob:")
    .replace("connect-src 'self' https:", "connect-src 'self' https: wss: blob:")
    + "; worker-src 'self' blob:",
};

const DEFAULT_HSTS = 'max-age=63072000; includeSubDomains; preload';
const DEFAULT_PERMISSIONS = 'camera=(), microphone=(), geolocation=(), browsing-topics=()';

function securityHeaders(opts = {}) {
  const headers = [
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

exports.CSP_PRESETS = CSP_PRESETS;
exports.securityHeaders = securityHeaders;
