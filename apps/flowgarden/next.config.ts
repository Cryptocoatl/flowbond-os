import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
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
