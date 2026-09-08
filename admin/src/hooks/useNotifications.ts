import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'

export type NotifSeverity = 'action' | 'warn' | 'info'

export interface NotifItem {
  id: string
  kind: string
  severity: NotifSeverity
  title: string
  detail: string
  link: string
  employee_id?: string
  employee_name?: string
  at: string
}

export interface NotifPayload {
  items: NotifItem[]
  count: number       // จำนวน severity=action (ตัวเลขบนกระดิ่ง)
  warn_count: number
}

// poll ทุก 45 วิ — เบาพอสำหรับ read-only aggregate, refetch ตอน tab กลับมา focus
export function useNotifications() {
  return useQuery<NotifPayload>({
    queryKey: ['admin', 'notifications'],
    queryFn: () => api.get('/api/v1/admin/notifications').then(r => r.data.data),
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
    placeholderData: prev => prev,
  })
}
