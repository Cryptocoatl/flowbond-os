// @flowbond/security · next (compiled ESM)
import { securityHeaders } from './headers.mjs';

export function withSecurity(config = {}, opts = {}) {
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
