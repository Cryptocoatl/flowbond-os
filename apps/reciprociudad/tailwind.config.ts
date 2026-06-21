import type { Config } from 'tailwindcss';

/**
 * Códice-solarpunk design tokens — the `:root` palette from `BUILD.md`,
 * mapped to named Tailwind colors. The same hex values are also declared as
 * CSS variables in `app/globals.css` (the ported design system relies on
 * `var(--token)`); this block exposes them to Tailwind utilities too.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abismo: '#062623', // agua profunda / base oscura
        lago: '#0b3a3a', // teal profundo (Atitlán)
        agua: '#22c4b2', // turquesa luminoso (Atlantis)
        aqua: '#7fe3d0',
        selva: '#2f9e6e', // verde regenerativo (chinampa)
        hoja: '#9fd356', // hoja al sol
        oro: '#f2b340', // hora dorada (CTA)
        miel: '#ffd98a', // luz miel
        coral: '#ff6f5e', // acento asoleado
        arena: { DEFAULT: '#f4ecd8', 2: '#fcf8ee' }, // fondo claro (amate)
        tierra: '#2a2018', // texto cálido
        papel: '#f3ecdc',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Fraunces', 'serif'],
        sans: ['var(--font-hanken)', 'Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
      },
      maxWidth: {
        wrap: '1180px',
      },
      transitionTimingFunction: {
        flow: 'cubic-bezier(.19,1,.22,1)',
      },
    },
  },
  plugins: [],
};

export default config;
