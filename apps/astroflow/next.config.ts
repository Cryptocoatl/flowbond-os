import type { NextConfig } from 'next';
import path from 'path';
import { withSecurity } from '@flowbond/security/next';

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/auth', '@flowbond/ui', '@flowbond/security'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

export default withSecurity(nextConfig);
