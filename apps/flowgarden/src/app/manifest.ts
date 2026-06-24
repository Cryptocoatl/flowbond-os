import type { MetadataRoute } from 'next'

// PWA manifest served at /manifest.webmanifest
// Makes FlowGarden installable to the home screen as a standalone app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'FlowGarden — Grow · Flow · Thrive',
    short_name: 'FlowGarden',
    description:
      'A living ecosystem where growth is effortless, connected and abundant. Track your garden, log moments, and complete missions.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    theme_color: '#0A1A0C',
    background_color: '#0A1A0C',
    categories: ['lifestyle', 'productivity', 'utilities'],
    icons: [
      { src: '/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Log a moment',
        short_name: 'Journal',
        description: 'Capture what is happening in your garden',
        url: '/journal?source=pwa-shortcut',
      },
      {
        name: 'Today’s missions',
        short_name: 'Missions',
        description: 'See what needs doing today',
        url: '/tasks?source=pwa-shortcut',
      },
      {
        name: 'My plants',
        short_name: 'Plants',
        description: 'Check on your plants',
        url: '/plants?source=pwa-shortcut',
      },
    ],
  }
}
