import type { NextConfig } from 'next';
import path from 'path';
import { withSecurity } from '@flowbond/security/next';

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/security'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  serverExternalPackages: ['@fal-ai/client', '@google/genai', '@runwayml/sdk', 'c2pa'],
};

export default withSecurity(nextConfig);
