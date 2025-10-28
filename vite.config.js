import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // 개발환경에서 /api/* 요청을 백엔드로 프록시하여 CORS를 우회
      '/api': {
        target: 'https://app.floorida.site',
        changeOrigin: true,
        secure: true,
        // don't rewrite path so '/api/..." stays '/api/...'
      },
    },
  },
})
