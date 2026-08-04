import type { NextConfig } from 'next'
import { join } from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/core', '@flowbond/ui', '@flowbond/flowedit'],
  // Pin file-tracing to the monorepo root (multiple lockfiles exist on this machine).
  outputFileTracingRoot: join(__dirname, '../..'),
  async rewrites() {
    // Path-mount the FlowScrow separation-agreement vault (own Next app, own
    // deployment) at flowbond.life/separationagreement so the shared link stays stable.
    // Points at the `flowscrow` Cloudflare Worker; it has no custom domain of its
    // own because this rewrite is the only way in.
    const FLOWSCROW = 'https://flowscrow.cryptocoatl101.workers.dev'
    return [
      { source: '/separationagreement', destination: `${FLOWSCROW}/separationagreement` },
      { source: '/separationagreement/:path*', destination: `${FLOWSCROW}/separationagreement/:path*` },
    ]
  },
}

export default nextConfig
