import type { NextConfig } from 'next'
import { join } from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbond/ui'],
  outputFileTracingRoot: join(__dirname, '../..'),
  // El deck no tiene rutas de servidor: se exporta como sitio estático y se
  // sirve desde Cloudflare Pages. `unoptimized` porque el optimizador de
  // imágenes de Next necesita un servidor y aquí no hay ninguno.
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
