// admin/src/hooks/useFeatureEnabled.ts
// ฟีเจอร์ของแพ็กเกจที่เปิดอยู่ไหม — ไม่มี key = เปิด (ตรงกับฝั่ง server isFeatureEnabled: tenant เดิมที่ไม่เคยตั้งค่าใช้ได้ครบ)
import { useAuthStore } from '../stores/authStore'

export function useFeatureEnabled(key: string): boolean {
  const ef = useAuthStore(s => s.enabledFeatures)
  return !ef || ef[key] !== false
}
