import type { NextConfig } from 'next';
import path from 'path';

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
};

export default nextConfig;
