// admin/src/pages/leave/VacationPolicyTab.tsx
// รวมนโยบายพักร้อนตามอายุงาน (feedback 2026-09-15 ทั้ง 9 ข้อที่เกี่ยวกับพักร้อน) มา
// ไว้ที่เดียว — เดิมกระจายอยู่ 3 ที่ (ผังองค์กร→ตำแหน่ง, วันหยุดนักขัตฤกษ์, โควต้า)
// จนผู้ใช้บอกว่างง — หน้านี้เป็น "จุดเริ่มต้น" ที่มีสรุป+เครื่องมือครบ ส่วนการแก้ไข
// เต็มรูปแบบ (เช่น ตั้งค่าตำแหน่งอื่นๆ, วันหยุดครบทุก field) ยังอยู่ที่หน้าเดิม —
// ฟอร์มย่อยในนี้เขียนไปที่ endpoint เดียวกัน ไม่ได้สร้างข้อมูลซ้ำ
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sliders, Gift, RefreshCw, Users, Info, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/axios'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiPosition {
  id: string; name: string
  department?: { id: string; name: string; division?: { id: string; name: string } | null } | null
  vacation_base_days?: number | null
  vacation_increment_days?: number | null
  vacation_increment_years?: number | null
}
interface ApiHoliday {
  id: string; name: string; date: string
  compensate_days?: number
  compensate_leave_type?: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE' | 'OTHER'
}
interface RemainingRow {
  employee_id: string; full_name: string; nickname: string | null; employee_code: string
  branch_name: string | null; position_name: string | null
  total_days: number; used_days: number; remaining: number; sellable: number
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#92400e', background: '#fef3c7' }
const td: React.CSSProperties = { padding: '7px 10px', fontSize: '0.82rem', borderBottom: '1px solid #f3f4f6' }
const numInput: React.CSSProperties = { width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.8rem', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }

function previewText(base: number | null | undefined, incDays: number | null | undefined, incYears: number | null | undefined) {
  if (base == null) return null
  const d = incDays ?? 1, y = incYears && incYears > 0 ? incYears : 0
  return [1, 3, 5].map(years => {
    const steps = y > 0 ? Math.floor((years - 1) / y) : 0
    return `${years}ปี=${base + d * steps}วัน`
  }).join(' · ')
}

export default function VacationPolicyTab() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [confirmReset, setConfirmReset] = useState(false)

  const { data: positions = [], isLoading: loadingPos } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const { data: holidays = [], isLoading: loadingHol } = useQuery<ApiHoliday[]>({
    queryKey: ['admin', 'super-admin-holidays', currentYear],
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year: currentYear } }).then(r => r.data.data),
  })
  const { data: remainingReport = [], isLoading: loadingRemaining, refetch: refetchRemaining } = useQuery<RemainingRow[]>({
    queryKey: ['admin', 'vacation-policy', 'remaining-report', currentYear - 1],
    queryFn: () => api.get('/api/v1/admin/vacation-policy/remaining-report', { params: { year: currentYear - 1 } }).then(r => r.data.data),
  })

  // แก้ไขสูตรพักร้อนของตำแหน่ง — เขียนไป endpoint เดียวกับที่ผังองค์กร→ตำแหน่งใช้
  const [posEdits, setPosEdits] = useState<Record<string, { base: string; incDays: string; incYears: string }>>({})
  const editOf = (p: ApiPosition) => posEdits[p.id] ?? {
    base: p.vacation_base_days == null ? '' : String(p.vacation_base_days),
    incDays: p.vacation_increment_days == null ? '' : String(p.vacation_increment_days),
    incYears: p.vacation_increment_years == null ? '' : String(p.vacation_increment_years),
  }
  const setEdit = (id: string, patch: Partial<{ base: string; incDays: string; incYears: string }>) =>
    setPosEdits(e => ({ ...e, [id]: { ...editOf(positions.find(p => p.id === id)!), ...e[id], ...patch } }))

  const savePositionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/positions/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['org-tree'] }); showToast('success', 'บันทึกสูตรพักร้อนแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  function savePosition(p: ApiPosition) {
    const e = editOf(p)
    savePositionMutation.mutate({
      id: p.id,
      body: {
        vacation_base_days: e.base.trim() === '' ? null : (parseInt(e.base) || 0),
        vacation_increment_days: e.incDays.trim() === '' ? null : (parseInt(e.incDays) || 0),
        vacation_increment_years: e.incYears.trim() === '' ? null : (parseInt(e.incYears) || 0),
      },
    })
  }

  // แก้ไขประเภทที่ได้ตอนมาทำงานวันหยุด — เขียนไป endpoint เดียวกับหน้า "วันหยุดนักขัตฤกษ์"
  const saveHolidayTypeMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => api.patch(`/api/v1/super-admin/holidays/${id}`, { compensate_leave_type: type }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'super-admin-holidays'] }); showToast('success', 'บันทึกแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const runBonusMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/vacation-policy/run-bonus').then(r => r.data),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['admin', 'leave-balances'] }); showToast('success', res?.message ?? 'รันโบนัสเสร็จแล้ว') },
    onError: () => showToast('error', 'รันไม่สำเร็จ'),
  })
  const runResetMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/vacation-policy/run-reset').then(r => r.data),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['admin', 'leave-balances'] }); refetchRemaining(); showToast('success', res?.message ?? 'รัน reset เสร็จแล้ว') },
    onError: () => showToast('error', 'รันไม่สำเร็จ'),
  })

  const configuredCount = positions.filter(p => p.vacation_base_days != null).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.6 }}>
          รวมนโยบายพักร้อนตามอายุงานทุกส่วนไว้ที่นี่ — พนักงานที่มีสิทธิ์ (ประจำ + ผ่านโปร + ตำแหน่งตั้งค่าไว้) จะได้พักร้อนเพิ่มอัตโนมัติทุก 1 ม.ค., ได้โบนัส +1 วันถ้าหยุดไม่ครบโควต้า/เดือน,
          และรวมวันหยุดที่จอง+วันพักร้อนที่ใช้ต้องไม่เกิน <strong>10 วัน/เดือน</strong> ต่อคน (บล็อกอัตโนมัติ แอดมิน force ข้ามได้)
        </div>
      </div>

      {/* ── สูตรพักร้อนตามอายุงาน ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><Sliders size={15} /></div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>สูตรพักร้อนตามอายุงาน (ต่อตำแหน่ง)</div>
        </div>
        <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: 12, marginLeft: 42 }}>
          {configuredCount}/{positions.length} ตำแหน่งตั้งค่าแล้ว — ตำแหน่งที่ไม่ตั้งค่า (เว้นว่าง) จะไม่มีสิทธิ์พักร้อนตามอายุงาน
        </div>
        {loadingPos ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ตำแหน่ง</th>
                  <th style={th}>แผนก</th>
                  <th style={th}>ครบ 1 ปี (วัน)</th>
                  <th style={th}>เพิ่มครั้งละ (วัน)</th>
                  <th style={th}>ทุกๆ (ปี)</th>
                  <th style={th}>ตัวอย่าง</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const e = editOf(p)
                  const preview = previewText(e.base.trim() === '' ? null : parseInt(e.base), e.incDays.trim() === '' ? null : parseInt(e.incDays), e.incYears.trim() === '' ? null : parseInt(e.incYears))
                  return (
                    <tr key={p.id}>
                      <td style={{ ...td, fontWeight: 700, color: '#111827' }}>{p.name}</td>
                      <td style={{ ...td, color: '#64748b' }}>{p.department?.name ?? '—'}</td>
                      <td style={td}><input type="number" min={0} placeholder="—" style={numInput} value={e.base} onChange={ev => setEdit(p.id, { base: ev.target.value })} /></td>
                      <td style={td}><input type="number" min={0} placeholder="1" style={numInput} value={e.incDays} onChange={ev => setEdit(p.id, { incDays: ev.target.value })} /></td>
                      <td style={td}><input type="number" min={1} placeholder="2" style={numInput} value={e.incYears} onChange={ev => setEdit(p.id, { incYears: ev.target.value })} /></td>
                      <td style={{ ...td, color: '#0369a1', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{preview ?? <span style={{ color: '#cbd5e1' }}>ไม่มีสิทธิ์</span>}</td>
                      <td style={td}>
                        <button onClick={() => savePosition(p)} disabled={savePositionMutation.isPending}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#244B83', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                          บันทึก
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── วันหยุดที่ให้พักร้อน/ชดเชย ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><Gift size={15} /></div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>มาทำงานวันหยุดบริษัท — ให้อะไร</div>
          </div>
          <button onClick={() => navigate('/leave?tab=holiday')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.76rem', color: '#374151', cursor: 'pointer' }}>
            จัดการวันหยุดเต็มรูปแบบ <ExternalLink size={11} />
          </button>
        </div>
        {loadingHol ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>กำลังโหลด...</div>
        ) : holidays.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีวันหยุดปีนี้</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>วันหยุด</th>
                  <th style={th}>วัน</th>
                  <th style={th}>ให้เป็น</th>
                </tr>
              </thead>
              <tbody>
                {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                  <tr key={h.id}>
                    <td style={{ ...td, fontWeight: 600, color: '#111827' }}>{h.name}</td>
                    <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(h.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} · {h.compensate_days ?? 1} วัน</td>
                    <td style={td}>
                      <select value={h.compensate_leave_type ?? 'COMPENSATE'} onChange={e => saveHolidayTypeMutation.mutate({ id: h.id, type: e.target.value })}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                        <option value="COMPENSATE">ชดเชย</option>
                        <option value="VACATION">พักร้อน</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── โบนัส/reset + รายงานคงเหลือ ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><Users size={15} /></div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>โบนัสรายเดือน & Reset ประจำปี</div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14 }}>
          ระบบรันให้อัตโนมัติทุกเดือน/ทุกปีอยู่แล้ว (cron) — ปุ่มนี้ไว้รันด้วยมือเผื่อพลาดรอบ หรืออยากดูผลทันที
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <button onClick={() => runBonusMutation.mutate()} disabled={runBonusMutation.isPending}
            style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #fcd34d', background: '#fef3c7', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {runBonusMutation.isPending ? 'กำลังรัน...' : 'รันโบนัส "หยุดไม่ครบโควต้า" เดือนที่แล้ว'}
          </button>
          <button onClick={() => setConfirmReset(true)} disabled={runResetMutation.isPending}
            style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#d97706', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {runResetMutation.isPending ? 'กำลังรัน...' : `รัน reset พักร้อนประจำปี ${currentYear + 543}`}
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
          พักร้อนคงเหลือปี {currentYear - 1 + 543} (ขายคืนบริษัทได้สูงสุด 10 วัน — HR คิดจ่ายนอกระบบ)
        </div>
        {loadingRemaining ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>กำลังโหลด...</div>
        ) : remainingReport.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีข้อมูลพักร้อนปี {currentYear - 1 + 543}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={th}>พนักงาน</th>
                  <th style={th}>ตำแหน่ง</th>
                  <th style={{ ...th, textAlign: 'right' }}>โควต้า</th>
                  <th style={{ ...th, textAlign: 'right' }}>ใช้ไป</th>
                  <th style={{ ...th, textAlign: 'right' }}>คงเหลือ</th>
                  <th style={{ ...th, textAlign: 'right' }}>ขายคืนได้</th>
                </tr>
              </thead>
              <tbody>
                {remainingReport.map(row => (
                  <tr key={row.employee_id}>
                    <td style={td}>{row.full_name}{row.nickname ? ` (${row.nickname})` : ''}</td>
                    <td style={{ ...td, color: '#64748b' }}>{row.position_name ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.total_days}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.used_days}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{row.remaining}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: row.sellable > 0 ? '#d97706' : '#94a3b8', fontWeight: 700 }}>{row.sellable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {confirmReset && (
          <ConfirmDialog
            variant="warning"
            title={`รัน reset พักร้อนประจำปี ${currentYear + 543}?`}
            message="ระบบจะตั้งวันพักร้อนของพนักงานทุกคนที่มีสิทธิ์ใหม่ตามสูตรอายุงาน (ไม่ยกยอดจากปีก่อน) — คนที่ตำแหน่งยังไม่ได้ตั้งค่าโปรแกรมพักร้อนจะไม่ถูกแตะ"
            confirmLabel="ยืนยันรัน"
            onConfirm={() => { setConfirmReset(false); runResetMutation.mutate() }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </div>
    </div>
  )
}
