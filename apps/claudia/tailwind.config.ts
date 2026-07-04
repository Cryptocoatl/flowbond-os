import type { Config } from 'tailwindcss';

// ClaudIA's palette — La Guardiana. Moonlight → flow-teal → dawn-coral → gold,
// on a deep cosmos night. See the character bible §5 / master spec §8.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        moon: '#F4F1EA',
        flow: '#2FB6A8',
        dawn: '#FF8A6B',
        gold: '#FFD27A',
        night: '#0E1A2B',
        'night-deep': '#070F1A',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
