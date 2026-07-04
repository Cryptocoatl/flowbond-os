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
  // Vanity alias to the Causas Globales survey (lives on flowme.one, the
  // shared FlowMap engine) — not permanent since it's a convenience pointer,
  // not a canonical URL move.
  async redirects() {
    return [
      { source: '/causasglobalesflowmap', destination: 'https://flowme.one/causas-globales', permanent: false },
    ];
  },
};

export default nextConfig;
