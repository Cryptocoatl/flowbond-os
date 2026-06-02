import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#09090b',
          surface: '#18181b',
          border: '#27272a',
          muted: '#3f3f46',
          text: '#fafafa',
          dim: '#a1a1aa',
          accent: '#7c3aed',
          'accent-light': '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
