import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3003', 'dev.flowbond.life'] },
  },
}

export default nextConfig
