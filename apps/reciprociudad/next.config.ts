import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // three.js ships ESM; transpile it (and the r3f stack) for the app bundle.
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  // Serve the static Sani Templo film at a clean /sanitemplo URL
  // (the file lives at public/sanitemplo/index.html).
  async rewrites() {
    return [{ source: '/sanitemplo', destination: '/sanitemplo/index.html' }];
  },
};

export default nextConfig;
