import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'fs'

// every season with a data file (public/data/<year>.json), so a new season shows up on the
// site as soon as its file exists, with no code change
const SEASONS = readdirSync(new URL('./public/data', import.meta.url))
  .map(f => /^(\d{4})\.json$/.exec(f)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b)

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __BUILD_TIME__: JSON.stringify(Date.now()),
    __SEASONS__: JSON.stringify(SEASONS),
  },
})
