import path from 'path';

/**
 * Superficie de patrocinio de Sani Templo, export ESTÁTICO → Cloudflare Pages.
 * Todas las rutas son estáticas; los datos entran por el cliente (RPC públicos)
 * y por el Worker sanitemplo-api. Cero servidor Next → cero riesgo, honra rule 0.1.
 */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@flowbond/sanitemplo-core'],
  turbopack: { root: path.resolve(process.cwd(), '../..') },
};

export default nextConfig;
