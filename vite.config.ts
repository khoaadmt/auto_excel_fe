import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.API_BASE_URL || '/api'

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.API_BASE_URL': JSON.stringify(apiBaseUrl.replace(/\/+$/, '')),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            antd: ['antd', '@ant-design/icons'],
          },
        },
      },
    },
    server: {
      port: 5173,
    },
  }
})
