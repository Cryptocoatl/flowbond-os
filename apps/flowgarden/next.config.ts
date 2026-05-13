import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/core', '@flowbond/db'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

export default nextConfig
