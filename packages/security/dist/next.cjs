'use strict';
Object.defineProperty(exports, '__esModule', { value: true });

const { securityHeaders } = require('./headers.cjs');

function withSecurity(config = {}, opts = {}) {
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

exports.withSecurity = withSecurity;
