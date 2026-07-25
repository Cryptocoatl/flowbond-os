import type { Config } from 'tailwindcss';

// =============================================================================
// Kai World design language. Extracted from the reference comps into tokens so
// every component reads from one source. Never hardcode a hex in a component.
// =============================================================================
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kai: {
          bg: '#080b0a', // deepest canvas
          surface: '#0d1311', // panel base
          raised: '#111815', // hovered / nested panel
          line: '#1b2521', // hairline borders
          text: '#E9EEEB', // primary text
          muted: '#8B9791', // secondary text
          faint: '#586762', // tertiary / captions
          gold: '#F4C25A', // primary accent (sacred / creation)
          jade: '#6FCF97', // living / eco
          // economy currencies (points system)
          flow: '#7BE0B0',
          impact: '#B69CFF',
          creation: '#F4C25A',
          wisdom: '#7CC7FF',
          token: '#F4A65A',
          danger: '#F2795B',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(244,194,90,0.25), 0 0 30px -6px rgba(244,194,90,0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        breathe: 'breathe 4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        shake: 'shake 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;
