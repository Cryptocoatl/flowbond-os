import type { NextConfig } from 'next'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3003', 'dev.flowbond.life'] },
  },
}

export default withSecurity(nextConfig, { csp: false })
