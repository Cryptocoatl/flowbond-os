import type { NextConfig } from 'next'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/core', '@flowbond/flowedit', '@flowbond/security'],
}

export default withSecurity(nextConfig, { csp: false })
