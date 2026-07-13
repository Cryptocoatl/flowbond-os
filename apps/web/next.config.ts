import type { NextConfig } from 'next'
import { join } from 'path'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/core', '@flowbond/ui', '@flowbond/flowedit', '@flowbond/security'],
  outputFileTracingRoot: join(__dirname, '../..'),
  async rewrites() {
    return [
      { source: '/separationagreement', destination: 'https://flowscrow-flowbond.vercel.app/separationagreement' },
      { source: '/separationagreement/:path*', destination: 'https://flowscrow-flowbond.vercel.app/separationagreement/:path*' },
    ]
  },
}

export default withSecurity(nextConfig)
