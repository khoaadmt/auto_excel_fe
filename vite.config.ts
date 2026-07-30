import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:5000'

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.BACKEND_URL': JSON.stringify(backendUrl.replace(/\/+$/, '')),
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
