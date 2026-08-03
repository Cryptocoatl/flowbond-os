import type { NextConfig } from 'next'
import { join } from 'path'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/ui'],
  outputFileTracingRoot: join(__dirname, '../..'),
}

export default withSecurity(nextConfig, { csp: false })
