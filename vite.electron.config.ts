import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

// Packages that must NOT be bundled — they use CJS require() at runtime in Node.js
const MAIN_EXTERNALS = [
  'electron',
  'electron-updater',
  /^node:/,           // node:fs, node:path, node:url, etc.
]

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: MAIN_EXTERNALS,
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron', /^node:/],
            },
          },
        },
      },
    }),
  ],
  // Relative asset paths so the built app loads correctly from file://
  base: './',
})
