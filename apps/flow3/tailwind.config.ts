import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // near-black editor surfaces
        base: '#0a0b0d',
        panel: '#101317',
        'panel-2': '#161a1f',
        'panel-3': '#1c2127',
        line: 'rgba(255,255,255,0.07)',
        'line-2': 'rgba(255,255,255,0.12)',
        // cinematic grade
        teal: { DEFAULT: '#2dd4bf', bright: '#5eead4', deep: '#0f766e' },
        amber: { DEFAULT: '#f59e0b', bright: '#fbbf24', deep: '#b45309' },
        ink: { DEFAULT: '#e7e9ec', muted: '#8b9099', faint: '#5b616b' },
      },
      animation: {
        kenburns: 'kenburns 28s ease-in-out infinite alternate',
        'kenburns-2': 'kenburns2 32s ease-in-out infinite alternate',
        grade: 'grade 18s ease-in-out infinite alternate',
        grain: 'grain 0.5s steps(2) infinite',
        scan: 'scan 7s linear infinite',
        'pulse-rec': 'pulseRec 1.4s ease-in-out infinite',
        playhead: 'playhead 12s linear infinite',
      },
      keyframes: {
        kenburns: {
          '0%': { transform: 'scale(1.05) translate(0,0)' },
          '100%': { transform: 'scale(1.22) translate(-3%, 2%)' },
        },
        kenburns2: {
          '0%': { transform: 'scale(1.15) translate(2%, -1%)' },
          '100%': { transform: 'scale(1.0) translate(-2%, 1%)' },
        },
        grade: {
          '0%': { filter: 'hue-rotate(0deg) saturate(1.1)' },
          '100%': { filter: 'hue-rotate(-14deg) saturate(1.3)' },
        },
        grain: {
          '0%': { transform: 'translate(0,0)' },
          '100%': { transform: 'translate(-4%, 3%)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseRec: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        playhead: {
          '0%': { left: '0%' },
          '100%': { left: '100%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
