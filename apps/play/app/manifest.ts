import type { MetadataRoute } from 'next';
import { brand } from '@/lib/brand';

// Makes Kai World installable: added to an iPad's home screen it opens straight
// into the world, full-bleed, with no browser chrome eating the HUD. `start_url`
// goes to /play rather than the dashboard — the icon should land you in the game.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.productName,
    short_name: brand.productName,
    description: brand.promise,
    start_url: '/play',
    scope: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#05070a',
    theme_color: '#05070a',
    categories: ['games', 'education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
