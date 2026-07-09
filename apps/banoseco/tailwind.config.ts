import type { Config } from 'tailwindcss';

// BAÑOSECO tokens are CSS variables (--bs-*) declared in styles/tokens.css.
// We map them into Tailwind so utilities like bg-bs-jade / text-bs-gold work,
// without leaking any other app's palette into this one.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bs: {
          void: 'var(--bs-void)',
          void2: 'var(--bs-void2)',
          stone: 'var(--bs-stone)',
          line: 'var(--bs-line)',
          jade: 'var(--bs-jade)',
          'jade-hi': 'var(--bs-jade-hi)',
          'jade-deep': 'var(--bs-jade-deep)',
          bio: 'var(--bs-bio)',
          'bio-hi': 'var(--bs-bio-hi)',
          gold: 'var(--bs-gold)',
          'gold-hi': 'var(--bs-gold-hi)',
          'gold-deep': 'var(--bs-gold-deep)',
          sun: 'var(--bs-sun)',
          rare: 'var(--bs-rare)',
          clay: 'var(--bs-clay)',
          paper: 'var(--bs-paper)',
          'paper-dim': 'var(--bs-paper-dim)',
          'paper-faint': 'var(--bs-paper-faint)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        hud: ['var(--font-hud)', 'ui-monospace', 'monospace'],
        codex: ['var(--font-codex)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
