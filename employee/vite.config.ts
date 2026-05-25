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
          hmr: {
            protocol: 'wss',
            host: externalHost,
            clientPort: 443,
          },
          allowedHosts: [externalHost],
        }
      : { host: true },
  }
})
