import type { NextConfig } from 'next'
import { join } from 'path'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/core', '@flowbond/ui', '@flowbond/flowedit', '@flowbond/security'],
  // Pin file-tracing to the monorepo root (multiple lockfiles exist on this machine).
  outputFileTracingRoot: join(__dirname, '../..'),
  async rewrites() {
    // Path-mount the FlowScrow separation-agreement vault (own Next app, own
    // deployment) at flowbond.life/separationagreement so the shared link stays stable.
    return [
      { source: '/separationagreement', destination: 'https://flowscrow-flowbond.vercel.app/separationagreement' },
      { source: '/separationagreement/:path*', destination: 'https://flowscrow-flowbond.vercel.app/separationagreement/:path*' },
    ]
  },
}

export default withSecurity(nextConfig)
