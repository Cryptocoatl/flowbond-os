import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        ink2: 'var(--ink-2)',
        paper: 'var(--paper)',
        gold: 'var(--gold)',
        rose: 'var(--rose)',
        violet: 'var(--violet)',
        azure: 'var(--azure)',
        sun: 'var(--sun)',
        aqua: 'var(--aqua)',
        hair: 'var(--hair)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        cond: 'var(--font-cond)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      transitionTimingFunction: {
        deck: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
