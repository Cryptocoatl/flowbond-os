import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth', '@flowbond/core', '@flowbond/db', '@flowbond/ui'],
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
