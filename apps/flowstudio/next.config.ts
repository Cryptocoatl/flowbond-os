import type { NextConfig } from 'next';
import path from 'path';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // The edit module shells out to ffmpeg / python and uses optional native-ish
  // SDKs (veo, runway, c2pa) via dynamic import. Keep them external so the
  // server bundle never tries to statically resolve packages that may not be
  // installed for a fal-only v1.
  serverExternalPackages: ['@fal-ai/client', '@google/genai', '@runwayml/sdk', 'c2pa'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
