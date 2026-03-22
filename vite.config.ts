import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          jszip: ['jszip'],
        }
      }
    }
  },
  server: {
    port: 3000
  }
})
