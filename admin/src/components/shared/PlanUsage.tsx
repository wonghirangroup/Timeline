// admin/src/components/shared/PlanUsage.tsx
// แสดงการใช้งานเทียบขีดจำกัดแพ็กเกจ (พนักงาน/สาขา/กลุ่ม) + เตือนเมื่อใกล้เต็ม
// ขีดจำกัดขยายได้จากฝั่ง Super Admin → Tenant Detail (PATCH /super-admin/tenants/:id)
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban } from 'lucide-react'
import { api } from '../../lib/axios'

export type PlanKind = 'employees' | 'branches' | 'groups'
interface Metric { used: number; limit: number }
export interface PlanUsage {
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
  employees: Metric
  branches: Metric
  groups: Metric
}

const LABEL: Record<PlanKind, string> = { employees: 'พนักงาน', branches: 'สาขา', groups: 'กลุ่ม' }
const UNIT: Record<PlanKind, string> = { employees: 'คน', branches: 'สาขา', groups: 'กลุ่ม' }

export function usePlanUsage() {
  return useQuery<PlanUsage>({
    queryKey: ['plan-usage'],
    queryFn: () => api.get('/api/v1/admin/plan-usage').then(r => r.data.data),
    staleTime: 30_000,
  })
}

function tone(used: number, limit: number) {
  const pct = limit > 0 ? used / limit : 0
  if (pct >= 1)   return { color: '#dc2626', bg: '#fef2f2', bar: '#dc2626', track: '#fee2e2' }
  if (pct >= 0.8) return { color: '#b45309', bg: '#fffbeb', bar: '#f59e0b', track: '#fef3c7' }
  return { color: '#16a34a', bg: 'transparent', bar: '#16a34a', track: '#e5e7eb' }
}

// เมตรเดียว — วางบนหัวหน้า พนักงาน / สาขา / ผังองค์กร
export function PlanMeter({ kind, compact }: { kind: PlanKind; compact?: boolean }) {
  const { data } = usePlanUsage()
  if (!data) return null
  const m = data[kind]
  const t = tone(m.used, m.limit)
  const pct = m.limit > 0 ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0
  const remain = Math.max(0, m.limit - m.used)
  const full = m.used >= m.limit
  const near = !full && m.used / m.limit >= 0.8

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: compact ? '4px 0' : '7px 12px', borderRadius: 10,
      background: t.bg,
      border: t.bg === 'transparent' ? 'none' : `1px solid ${t.color}33`,
      fontSize: '12px', flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{LABEL[kind]}</span>
      <div style={{ width: compact ? 70 : 96, height: 6, borderRadius: 99, background: t.track, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: pct + '%', height: '100%', background: t.bar, borderRadius: 99 }} />
      </div>
      <span style={{ fontWeight: 700, color: t.color, fontVariantNumeric: 'tabular-nums' }}>
        {m.used} / {m.limit}
      </span>
      {full && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#dc2626', fontWeight: 600 }}><Ban size={12} /> เต็มแล้ว</span>}
      {near && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#b45309', fontWeight: 600 }}><AlertTriangle size={12} /> เหลือ {remain} {UNIT[kind]}</span>}
    </div>
  )
}

// แถวรวม 3 เมตร — วางบน Dashboard
export function PlanUsageRow() {
  const { data } = usePlanUsage()
  if (!data) return null
  const anyWarn = (['employees', 'branches', 'groups'] as PlanKind[]).some(k => data[k].used / data[k].limit >= 0.8)
  return (
    <div style={{
      background: '#fff', border: `1px solid ${anyWarn ? '#fcd34d' : '#e5e7eb'}`, borderRadius: 12,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        แพ็กเกจ {data.plan}
      </span>
      <PlanMeter kind="employees" />
      <PlanMeter kind="branches" />
      <PlanMeter kind="groups" />
      {anyWarn && <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ใกล้เต็ม — แจ้งผู้ดูแลระบบเพื่อขยายแพ็กเกจ</span>}
    </div>
  )
}
