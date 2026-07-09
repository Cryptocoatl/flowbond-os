// ════════════════════════════════════════════════════════════════════════
//  @flowbond/security · next  — FloGuard FG-030
//
//  Drop-in wrapper for an app's next.config. Disables the x-powered-by leak and
//  applies the canonical security headers to every route, preserving any
//  headers() the app already defines.
//
//  Usage (apps/<app>/next.config.ts):
//    import { withSecurity } from '@flowbond/security/next';
//    import { CSP_PRESETS } from '@flowbond/security';
//    export default withSecurity({ transpilePackages: [...] }, { csp: CSP_PRESETS.webgl });
//
//  Remember to add '@flowbond/security' to the app's transpilePackages.
// ════════════════════════════════════════════════════════════════════════

import type { NextConfig } from 'next';
import { securityHeaders, type SecurityHeadersOptions } from './headers.js';

export function withSecurity(
  config: NextConfig = {},
  opts: SecurityHeadersOptions = {},
): NextConfig {
  const existingHeaders = config.headers;
  const ours = securityHeaders(opts);

  return {
    ...config,
    poweredByHeader: false,
    async headers() {
      const prior = existingHeaders ? await existingHeaders() : [];
      return [...prior, { source: '/:path*', headers: ours }];
    },
  };
}
