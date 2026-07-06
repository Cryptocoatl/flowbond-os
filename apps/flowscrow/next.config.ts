import type { NextConfig } from 'next';
import path from 'path';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

// Path-mounted at flowbond.life/separationagreement. basePath namespaces every
// route + asset (/_next) under that prefix so a rewrite on the flowbond.life
// project can proxy /separationagreement/* here without colliding with the host
// app's routes or assets.
const nextConfig: NextConfig = {
  basePath: '/separationagreement',
  transpilePackages: ['@flowbond/auth'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
