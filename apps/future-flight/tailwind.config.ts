import type { Config } from 'tailwindcss'
import { futureFlightPreset } from './design-system/tailwind.preset'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  presets: [futureFlightPreset as Config],
  theme: { extend: {} },
  plugins: [],
}

export default config
