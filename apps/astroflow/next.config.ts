import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth', '@flowbond/ui'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // Pin file-tracing to the monorepo root — several lockfiles exist on this
  // machine and OpenNext needs the trace rooted where the workspace is.
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  async headers() {
    // The other half of the pair with public/_headers: these cover what the
    // Worker actually renders (pages + /api/*), which never touches the assets
    // binding. Deliberately no CSP — React inline styles carry the chart wheel,
    // the ACG map and the resonance rings.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
