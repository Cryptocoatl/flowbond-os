import type { Config } from 'tailwindcss'
import flowbondPreset from '@flowbond/ui/tailwind-preset'

const config: Config = {
  presets: [flowbondPreset as Partial<Config>],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
