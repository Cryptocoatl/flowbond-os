import type { NextConfig } from 'next';
import path from 'path';
import { withSecurity } from '@flowbond/security/next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

export default withSecurity(nextConfig, { csp: false });
