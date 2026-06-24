import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        'flow-gold': '#C9A961',
        'flow-dark': '#0F2E1F',
        'flow-sage': '#8FA98F',
        'flow-cream': '#EFE8D8',
      },
    },
  },
  plugins: [],
};

export default config;
