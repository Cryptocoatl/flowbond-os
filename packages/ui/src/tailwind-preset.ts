/**
 * FlowBond Tailwind preset — mirrors the names in tokens.css so utilities like
 * `bg-void`, `text-violet-bright`, `font-serif` resolve to the same CSS vars the
 * ported prototype CSS uses. Apps spread this into their own `presets: [...]`.
 *
 * Typed structurally (no `tailwindcss` import) so this package needs no Tailwind
 * dependency; consumers cast it to `Partial<Config>`.
 *
 * Color logic: violet = Intelligence/AI · gold = Value/Blockchain · jade = Life/RVBL.
 */
const preset = {
  theme: {
    extend: {
      colors: {
        void: { DEFAULT: 'var(--void)', 2: 'var(--void-2)', 3: 'var(--void-3)' },
        violet: { DEFAULT: 'var(--violet)', bright: 'var(--violet-bright)', deep: 'var(--violet-deep)' },
        gold: { DEFAULT: 'var(--gold)', bright: 'var(--gold-bright)', deep: 'var(--gold-deep)' },
        jade: { DEFAULT: 'var(--jade)', deep: 'var(--jade-deep)' },
        bone: 'var(--bone)',
        muted: { DEFAULT: 'var(--muted)', 2: 'var(--muted-2)' },
        hair: { DEFAULT: 'var(--hair)', gold: 'var(--hair-gold)' },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        mono: ['var(--font-space-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        script: ['var(--font-caveat)', 'cursive'],
      },
    },
  },
}

export default preset
