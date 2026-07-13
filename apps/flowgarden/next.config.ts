import type { NextConfig } from 'next'
import path from 'path'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth', '@flowbond/core', '@flowbond/db', '@flowbond/ui', '@flowbond/security'],
  async redirects() {
    return [
      { source: '/flowgarden', destination: '/', permanent: true },
      { source: '/flowgarden/:path*', destination: '/:path*', permanent: true },
    ]
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    resolveAlias: {
      porto: './src/lib/empty-module.ts',
      'porto/internal': './src/lib/empty-module.ts',
      accounts: './src/lib/empty-module.ts',
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

export default withSecurity(nextConfig)
