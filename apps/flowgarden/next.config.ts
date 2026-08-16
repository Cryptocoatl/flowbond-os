import type { NextConfig } from 'next'
import path from 'path'

// Same set as @flowbond/security's securityHeaders({ csp: false }), inlined:
// that package's `next` entry can't be require()d from a compiled next.config.
//
// CSP is deliberately omitted. The strict preset sets `script-src 'self'`, which
// would block the inline theme-init script in app/layout.tsx (it must run before
// first paint to avoid a light/dark flash). Enabling CSP means hashing that
// script first — worth doing, but not as part of the host move.
//
// These cover worker-rendered routes only. Static assets are served by the
// Workers Assets binding and never reach the worker, so they get the same
// headers from public/_headers. Both are needed.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  transpilePackages: ['@flowbond/auth', '@flowbond/core', '@flowbond/db', '@flowbond/ui'],
  // Compatibility shim: the app dropped the redundant /flowgarden URL segment.
  // Keep old deep links, bookmarks, and the installed PWA's cached start_url
  // working by 308-redirecting the legacy paths to their clean equivalents.
  // Query strings (e.g. ?source=pwa) are preserved automatically.
  async redirects() {
    return [
      { source: '/flowgarden', destination: '/', permanent: true },
      { source: '/flowgarden/:path*', destination: '/:path*', permanent: true },
    ]
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    // Stub optional wagmi v3 connectors (Porto / Tempo) we don't use.
    resolveAlias: {
      porto: './src/lib/empty-module.ts',
      'porto/internal': './src/lib/empty-module.ts',
      accounts: './src/lib/empty-module.ts',
    },
  },
  webpack: (config) => {
    // @wagmi/connectors v8 pulls optional connectors (Porto, Tempo) that import
    // packages we don't install. Stub them so the bundle resolves.
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
      'porto/internal': false,
      accounts: false,
    }
    return config
  },
}

export default nextConfig
