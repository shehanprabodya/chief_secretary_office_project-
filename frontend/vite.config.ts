import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep production JavaScript compatible with the oldest supported Chrome.
    target: 'chrome90',
  },
})
