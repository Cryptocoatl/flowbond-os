import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        void: '#030014',
        nebula: '#0b0124',
        flow: {
          violet: '#8b5cf6',
          magenta: '#e879f9',
          cyan: '#22d3ee',
          emerald: '#34d399',
          gold: '#fbbf24',
        },
      },
      animation: {
        'aurora-slow': 'aurora 24s ease-in-out infinite alternate',
        'aurora-mid': 'aurora 17s ease-in-out infinite alternate-reverse',
        float: 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
      },
      keyframes: {
        aurora: {
          '0%': { transform: 'translate(0,0) scale(1) rotate(0deg)' },
          '50%': { transform: 'translate(8%, -6%) scale(1.15) rotate(8deg)' },
          '100%': { transform: 'translate(-6%, 5%) scale(0.95) rotate(-6deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 24px 2px rgba(139,92,246,0.35)' },
          '50%': { boxShadow: '0 0 48px 8px rgba(34,211,238,0.45)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
