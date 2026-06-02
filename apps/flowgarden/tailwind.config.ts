import type { Config } from 'tailwindcss'
import flowbondPreset from '@flowbond/config/tailwind/preset'

const config: Config = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presets: [flowbondPreset as any],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fg: {
          bg:             'var(--fg-bg)',
          surface:        'var(--fg-surface)',
          panel:          'var(--fg-panel)',
          border:         'var(--fg-border)',
          'border-accent':'var(--fg-border-accent)',
          text:           'var(--fg-text)',
          secondary:      'var(--fg-text-secondary)',
          muted:          'var(--fg-text-muted)',
          dim:            'var(--fg-text-dim)',
          gold:           'var(--fg-gold)',
          'gold-bg':      'var(--fg-gold-bg)',
          green:          'var(--fg-green)',
          'green-hover':  'var(--fg-green-hover)',
          'green-muted':  'var(--fg-green-muted)',
          sidebar:        'var(--fg-sidebar-bg)',
          'sidebar-text': 'var(--fg-sidebar-text)',
          'sidebar-active':'var(--fg-sidebar-active-text)',
        },
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card:   'var(--fg-shadow)',
        'card-lg': 'var(--fg-shadow-lg)',
      },
      borderRadius: {
        fg:    'var(--fg-radius)',
        'fg-sm': 'var(--fg-radius-sm)',
        'fg-lg': 'var(--fg-radius-lg)',
      },
    },
  },
  plugins: [],
}

export default config
