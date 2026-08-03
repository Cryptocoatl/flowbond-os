import type { NextConfig } from 'next'
import path from 'path'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth', '@flowbond/i18n', '@flowbond/ui', '@flowbond/security'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    // Stub optional wagmi v3 connectors (Porto / Tempo) we don't use.
    resolveAlias: {
      porto: './lib/empty-module.ts',
      'porto/internal': './lib/empty-module.ts',
      accounts: './lib/empty-module.ts',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
      'porto/internal': false,
      accounts: false,
    }
    return config
  },
}

export default withSecurity(nextConfig, { csp: false })
