import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // The edit module shells out to ffmpeg / python and uses optional native-ish
  // SDKs (veo, runway, c2pa) via dynamic import. Keep them external so the
  // server bundle never tries to statically resolve packages that may not be
  // installed for a fal-only v1.
  serverExternalPackages: ['@fal-ai/client', '@google/genai', '@runwayml/sdk', 'c2pa'],
};

export default nextConfig;
