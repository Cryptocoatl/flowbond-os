import type { NextConfig } from 'next'
import { withSecurity } from '@flowbond/security/next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/security'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
}

export default withSecurity(nextConfig)
