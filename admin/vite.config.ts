import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// build id = commit สั้นของ deploy นั้น (Vercel ส่ง VERCEL_GIT_COMMIT_SHA ให้ตอน build) — โชว์ใน footer คู่กับเลขเวอร์ชัน จะได้ดูออกว่าเครื่องนี้ได้โค้ดล่าสุดหรือยัง
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)),
  },
  plugins: [react()],
  server: {
    proxy: {
      // ยิง /api/... จาก localhost:5173 → localhost:3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
