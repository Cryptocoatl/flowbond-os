import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth', '@flowbond/ui'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  async headers() {
    // /openflow is a private single-guest experience; /vault serves its PDF
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    return [
      { source: '/openflow', headers: noindex },
      { source: '/openflow/:path*', headers: noindex },
      { source: '/vault/:path*', headers: noindex },
    ];
  },
};

export default nextConfig;
