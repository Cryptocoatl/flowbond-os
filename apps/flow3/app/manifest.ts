import type { MetadataRoute } from 'next';

// PWA manifest — makes FlowStudio installable to the home screen and launch
// standalone (no browser chrome), so it feels like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlowStudio — The Creation Engine',
    short_name: 'FlowStudio',
    description: 'Drop your footage. Direct the edit. Cinematic video, on command.',
    start_url: '/studio',
    id: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#05070A',
    theme_color: '#05070A',
    categories: ['photo', 'video', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
