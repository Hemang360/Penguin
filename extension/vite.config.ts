import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: 'src/content.ts',
        background: 'src/background.ts',
        popup: 'src/popup/popup.tsx'
      },
      output: {
        entryFileNames: assetInfo => {
          const name = assetInfo.name || 'bundle'
          if (name.includes('content')) return 'content.js'
          if (name.includes('background')) return 'background.js'
          if (name.includes('popup')) return 'popup.js'
          return '[name].js'
        }
      }
    }
  }
})

