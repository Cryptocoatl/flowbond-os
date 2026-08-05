import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // three.js ships ESM; transpile it (and the r3f stack) for the app bundle.
  // @flowbond/sanitemplo-core is a workspace TS package → transpile it too.
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@flowbond/sanitemplo-core'],
  // Higher-quality next/image encode for the cinematic vision stills.
  // Images replaced from /admin live in the public `reciprociudad-media`
  // Supabase bucket, so they must be allowed as remote sources (still
  // optimized by next/image — never served raw).
  images: {
    qualities: [75, 88],
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
  },
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
