import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const externalHost = env.VITE_DEV_HOST || env.NGROK_HOST || ''

  return {
    plugins: [react()],
    server: externalHost
      ? {
          host: true,
          hmr: { protocol: 'wss', host: externalHost, clientPort: 443 },
          allowedHosts: [externalHost],
        }
      : { host: true },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query', 'zustand', 'axios'],
            'vendor-ui':    ['lucide-react', 'dayjs'],
            'liff':         ['@line/liff'],
            'qr':           ['jsqr'],
          },
        },
      },
    },
  }
})
