// admin/src/hooks/useActiveOffsite.ts
// พนักงานที่กำลังเช็คอินนอกสถานที่อยู่ตอนนี้ (ยังไม่เช็คเอาต์) — ใช้ร่วมกันหลายหน้า
// (Dashboard/รายชื่อพนักงาน/เช็คชื่อรายวัน) queryKey เดียวกันเลยแชร์ cache กัน ไม่ยิงซ้ำ
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/authStore'

export interface ActiveOffsiteRecord {
  id: string
  employee_id: string
  check_in_at: string
  check_in_address: string | null
  check_in_lat: string
  check_in_lng: string
  employee: {
    id: string; first_name: string; last_name: string; employee_code: string
    branch: { id: string; name: string }
  }
}

export function useActiveOffsite() {
  const enabledFeatures = useAuthStore(s => s.enabledFeatures)
  // tenant ไม่มี record enabled_features เลย หรือไม่มี key นี้ = เปิดใช้งาน (backward-compatible)
  const gpsCheckinEnabled = !enabledFeatures || enabledFeatures.gps_checkin !== false

  const { data: activeOffsite = [] } = useQuery<ActiveOffsiteRecord[]>({
    queryKey: ['admin', 'offsite-checkins', 'active'],
    queryFn: () => api.get('/api/v1/admin/offsite-checkins', { params: { status: 'active' } }).then(r => r.data.data),
    refetchInterval: 60_000,
    enabled: gpsCheckinEnabled,
  })
  const activeOffsiteByEmployee = new Map(activeOffsite.map(r => [r.employee_id, r]))
  return { activeOffsite, activeOffsiteByEmployee }
}
