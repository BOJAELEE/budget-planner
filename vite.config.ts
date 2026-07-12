import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 리포지토리명으로 base 설정 (예: /budget-planner/)
export default defineConfig({
  base: '/budget-planner/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '가계부 예산 계산기',
        short_name: '가계부',
        theme_color: '#3182F6',
        background_color: '#F9FAFB',
        display: 'standalone',
        start_url: '/budget-planner/',
        scope: '/budget-planner/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
