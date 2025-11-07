import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  base: '/',
  build: {
    // Ensure proper chunking and module format
    rollupOptions: {
      output: {
        // Ensure proper file extensions and module format
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        format: 'es'
      }
    },
    // Ensure source maps are generated for debugging (optional)
    sourcemap: false
  }
})
