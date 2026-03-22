import { defineConfig } from 'vite'

// GitHub Pages 배포 시 base 경로 설정
// 저장소명이 'media-viewer'인 경우 → base: '/media-viewer/'
// 커스텀 도메인 사용 시 → base: '/'
const base = process.env.GITHUB_PAGES === 'true' ? '/media-viewer/' : '/';

export default defineConfig({
  base,
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
