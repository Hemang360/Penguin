import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true, 
    rollupOptions: {
      input: {
        content: 'src/content.ts',
        background: 'src/background.ts',
        popup: 'src/popup/popup.tsx' 
      },
      output: {
        entryFileNames: '[name].js', 
        chunkFileNames: 'chunks/[name]-[hash].js' 
      },
      
    }
  }
})