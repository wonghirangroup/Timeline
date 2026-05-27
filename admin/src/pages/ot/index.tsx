import { useState, useMemo } from 'react'
import { MOCK_BRANCHES } from '../../lib/mock'
import type { OtRequest, OtStatus } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useDemoStore } from '../../stores/demoStore'

const OT_WEEKLY_CAP = 36

const STATUS_CFG: Record<OtStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา',  color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#15803d', bg: '#dcfce7' },
  REJECTED: { label: 'ไม่อนุมัติ',  color: '#dc2626', bg: '#fee2e2' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) { const d = new Date(s); return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}` }

/** วันจันทร์ของสัปดาห์ที่ date อยู่ */
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/** คำนวณชั่วโมง OT ที่ APPROVED สำหรับพนักงานคนนี้ในสัปดาห์ที่ date อยู่ */
function getWeeklyApprovedHours(rows: OtRequest[], employeeId: string, weekStartStr: string): number {
  const ws = new Date(weekStartStr)
  const we = new Date(weekStartStr); we.setDate(we.getDate() + 6)
  return rows
    .filter(r => r.employee_id === employeeId && r.status === 'APPROVED')
    .filter(r => { const d = new Date(r.date); return d >= ws && d <= we })
    .reduce((s, r) => s + r.hours, 0)
}

/** สี + ข้อความตาม cap level */
function capLevel(hrs: number): { color: string; bg: string; border: string; emoji: string; label: string } {
  if (hrs >= OT_WEEKLY_CAP) return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', emoji: '🔴', label: 'เกินขีดจำกัด!' }
  if (hrs >= 30)            return { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', emoji: '🟠', label: 'ใกล้เกิน' }
  if (hrs >= 24)            return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '🟡', label: 'ใกล้ถึง' }
  return                           { color: '#15803d', bg: '#f0fdf4', border: '#86efac', emoji: '🟢', label: 'ปกติ' }
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}

export default function OtPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const { otRequests: rows, approveOt, rejectOt } = useDemoStore()

  const [statusFilter, setStatusFilter] = useState<OtStatus | ''>('')
  const [branchFilter, setBranchFilter] = useState('')
  const [rejectTarget, setRejectTarget] = useState<OtRequest | null>(null)
  const [rejectNote, setRejectNote]     = useState('')
  const [approveTarget, setApproveTarget] = useState<OtRequest | null>(null)

  // inline calculator state (not saved)
  const [calcRate, setCalcRate]           = useState('')
  const [calcMultiplier, setCalcMultiplier] = useState<number>(1.5)

  // วันจันทร์ของสัปดาห์ปัจจุบัน (2026-05-25)
  const currentWeekStart = getMondayOf(new Date().toISOString().slice(0, 10))

  // KPI
  const pending     = rows.filter(r => r.status === 'PENDING').length
  const approvedHrs = rows.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.hours, 0)

  // cap warning: พนักงานที่มีชม. OT approved ≥ 24 ในสัปดาห์นี้
  const capWarnings = useMemo(() => {
    const byEmp: Record<string, { employee_id: string; full_name: string; nickname: string; branch_name: string; hrs: number }> = {}
    rows
      .filter(r => r.status === 'APPROVED')
      .filter(r => {
        const ws = new Date(currentWeekStart)
        const we = new Date(currentWeekStart); we.setDate(we.getDate() + 6)
        const d  = new Date(r.date)
        return d >= ws && d <= we
      })
      .forEach(r => {
        if (!byEmp[r.employee_id]) {
          byEmp[r.employee_id] = { employee_id: r.employee_id, full_name: r.full_name, nickname: r.nickname, branch_name: r.branch_name, hrs: 0 }
        }
        byEmp[r.employee_id].hrs += r.hours
      })
    return Object.values(byEmp).filter(e => e.hrs >= 24).sort((a, b) => b.hrs - a.hrs)
  }, [rows, currentWeekStart])

  const nearCapCount = capWarnings.length

  // filtered table
  const filtered = rows.filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    (!branchFilter || r.branch_name === branchFilter)
  )

  const doApprove = () => {
    if (!approveTarget) return
    approveOt(approveTarget.id)
    showToast('success', `อนุมัติ OT ของ "${approveTarget.full_name}" เรียบร้อยแล้ว`)
    setApproveTarget(null)
    setCalcRate('')
    setCalcMultiplier(1.5)
  }
  const doReject = () => {
    if (!rejectTarget) return
    rejectOt(rejectTarget.id)
    showToast('info', `ไม่อนุมัติ OT ของ "${rejectTarget.full_name}"`)
    setRejectTarget(null)
    setRejectNote('')
  }

  const openApprove = (r: OtRequest) => {
    setApproveTarget(r)
    setCalcRate('')
    setCalcMultiplier(r.multiplier)
  }

  const modalBackdrop = (open: boolean): React.CSSProperties => ({
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: open ? 'flex' : 'none',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center', zIndex: 200,
  })
  const modalBox: React.CSSProperties = {
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : 16,
    padding: '24px',
    width: isMobile ? '100%' : 420,
    paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    maxHeight: isMobile ? '90vh' : 'none',
    overflowY: 'auto',
  }

  // คำนวณ inline
  const calcResult = approveTarget && calcRate && Number(calcRate) > 0
    ? approveTarget.hours * Number(calcRate) * calcMultiplier
    : null

  // weekly hours ของคนที่กำลัง approve (ไม่รวม row นี้เอง ถ้ายัง PENDING)
  const approveWeeklyHrs = approveTarget
    ? getWeeklyApprovedHours(rows, approveTarget.employee_id, getMondayOf(approveTarget.date))
    : 0
  const approveAfterHrs = approveTarget ? approveWeeklyHrs + approveTarget.hours : 0
  const approveCap      = approveTarget ? capLevel(approveAfterHrs) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 8 : 12 }}>
        {[
          { label: 'รอพิจารณา',   value: pending,      unit: 'รายการ', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'ชม. OT รวม',  value: approvedHrs,  unit: 'ชม.',    color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
          { label: '⚠️ ใกล้/เกิน Cap', value: nearCapCount, unit: 'คน', color: nearCapCount > 0 ? '#dc2626' : '#6b7280', bg: nearCapCount > 0 ? '#fef2f2' : '#f9fafb', border: nearCapCount > 0 ? '#fca5a5' : '#e5e7eb' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: isMobile ? '12px' : '16px 18px', border: `1px solid ${s.border}`, background: s.bg }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', fontWeight: 500 }}>{s.label}</p>
            <p style={{ fontSize: isMobile ? '1.3rem' : '24px', fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>
              {s.value} <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── Cap Warning Panel ── */}
      {capWarnings.length > 0 && (
        <div style={{ ...card, padding: isMobile ? 12 : 16, border: '1px solid #fca5a5', background: '#fff5f5' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
            ⚠️ ขีดจำกัด OT รายสัปดาห์ (Cap {OT_WEEKLY_CAP} ชม./สัปดาห์)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {capWarnings.map(emp => {
              const lv  = capLevel(emp.hrs)
              const pct = Math.min((emp.hrs / OT_WEEKLY_CAP) * 100, 100)
              return (
                <div key={emp.employee_id} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: `1px solid ${lv.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{emp.full_name}</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 6 }}>{emp.nickname} · {emp.branch_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: lv.color }}>{emp.hrs} / {OT_WEEKLY_CAP} ชม.</span>
                      <span style={{ background: lv.bg, color: lv.color, border: `1px solid ${lv.border}`, borderRadius: 99, padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {lv.emoji} {lv.label}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background: '#f1f5f9', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${pct}%`,
                      background: lv.color,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: '12px', cursor: 'pointer', fontWeight: 500,
              border: statusFilter === s ? '1.5px solid #f97316' : '1px solid #e5e7eb',
              background: statusFilter === s ? '#fff7ed' : '#fff',
              color: statusFilter === s ? '#ea580c' : '#4b5563',
            }}
          >
            {s === '' ? 'ทุกสถานะ' : STATUS_CFG[s as OtStatus].label}
            {s === 'PENDING' && pending > 0 ? ` (${pending})` : ''}
          </button>
        ))}
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '12px', background: '#fff', cursor: 'pointer', marginLeft: isMobile ? 0 : 'auto' }}
        >
          <option value="">ทุกสาขา</option>
          {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {/* ── Table / Cards ── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {isMobile ? (
          <div>
            {filtered.map((r, i) => {
              const s  = STATUS_CFG[r.status]
              const wk = getMondayOf(r.date)
              const wh = getWeeklyApprovedHours(rows, r.employee_id, wk)
              const lv = capLevel(wh)
              return (
                <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: r.status === 'PENDING' ? '#fffbf5' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{r.full_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{r.branch_name} · {thDate(r.date)}</div>
                    </div>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                  </div>
                  {/* Cap badge inline */}
                  {wh >= 24 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: '11px', color: lv.color, background: lv.bg, border: `1px solid ${lv.border}`, borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                        {lv.emoji} OT สัปดาห์นี้ {wh} ชม.
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#374151' }}>⏰ {r.start_time}–{r.end_time} ({r.hours} ชม.)</span>
                    <span style={{ fontSize: '0.78rem', color: '#374151' }}>× {r.multiplier}</span>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button onClick={() => openApprove(r)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#15803d', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>✓ อนุมัติ</button>
                        <button onClick={() => { setRejectTarget(r); setRejectNote('') }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600 }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่มีรายการ OT</div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                  {['พนักงาน','สาขา','วันที่','เวลา','ชม.','ตัวคูณ','OT สัปดาห์นี้','หมายเหตุ','สถานะ','จัดการ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const s  = STATUS_CFG[r.status]
                  const wk = getMondayOf(r.date)
                  const wh = getWeeklyApprovedHours(rows, r.employee_id, wk)
                  const lv = capLevel(wh)
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', background: r.status === 'PENDING' ? '#fffbf5' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{r.full_name}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{r.nickname}</p>
                      </td>
                      <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.branch_name}</td>
                      <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap', fontSize: '12px' }}>{thDate(r.date)}</td>
                      <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12px' }}>{r.start_time}–{r.end_time}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>{r.hours}</td>
                      <td style={{ padding: '11px 14px', color: '#6b7280', textAlign: 'center', fontSize: '12px' }}>{r.multiplier}×</td>
                      {/* Weekly OT cap column */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        {wh > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: lv.color }}>{wh} ชม.</span>
                              {wh >= 24 && (
                                <span style={{ background: lv.bg, color: lv.color, border: `1px solid ${lv.border}`, borderRadius: 99, padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}>{lv.emoji}</span>
                              )}
                            </div>
                            <div style={{ background: '#f1f5f9', borderRadius: 99, height: 4, width: 80, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, width: `${Math.min((wh / OT_WEEKLY_CAP) * 100, 100)}%`, background: lv.color }} />
                            </div>
                          </div>
                        ) : <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '12px', maxWidth: 160 }}>{r.note || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {r.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openApprove(r)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#15803d', color: '#fff', fontSize: '11px', fontWeight: 600 }}>✓ อนุมัติ</button>
                            <button onClick={() => { setRejectTarget(r); setRejectNote('') }} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontSize: '11px', fontWeight: 600 }}>ไม่อนุมัติ</button>
                          </div>
                        ) : <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่มีรายการ OT</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Approve Modal (with inline calculator) ── */}
      {approveTarget && (
        <div style={modalBackdrop(!!approveTarget)} onClick={() => setApproveTarget(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="#15803d" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>อนุมัติ OT</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{approveTarget.full_name} · {thDate(approveTarget.date)}</p>
              </div>
            </div>

            {/* OT Info */}
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '13px', color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>เวลา OT</span>
                <span style={{ fontWeight: 600 }}>{approveTarget.start_time} – {approveTarget.end_time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>จำนวนชั่วโมง</span>
                <span style={{ fontWeight: 600 }}>{approveTarget.hours} ชม.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ตัวคูณ OT</span>
                <span style={{ fontWeight: 600 }}>{approveTarget.multiplier}×</span>
              </div>
            </div>

            {/* Cap warning ถ้าอนุมัติแล้วจะเกิน/ใกล้เกิน */}
            {approveCap && approveAfterHrs >= 24 && (
              <div style={{ background: approveCap.bg, border: `1px solid ${approveCap.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: '12px', color: approveCap.color, fontWeight: 600 }}>
                  {approveCap.emoji} หากอนุมัติ: OT สัปดาห์นี้จะเป็น <strong>{approveAfterHrs} / {OT_WEEKLY_CAP} ชม.</strong> — {approveCap.label}
                </p>
                {/* Mini progress */}
                <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 99, height: 4, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${Math.min((approveAfterHrs / OT_WEEKLY_CAP) * 100, 100)}%`, background: approveCap.color }} />
                </div>
              </div>
            )}

            {/* ── คิดเร็ว (Inline Calculator) ── */}
            <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>🧮 คิดเร็ว (ไม่บันทึกในระบบ)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {/* อัตรา/ชม. */}
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: 4 }}>อัตรา (฿/ชม.)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="เช่น 65"
                    value={calcRate}
                    onChange={e => setCalcRate(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {/* ตัวคูณ */}
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: 4 }}>ตัวคูณ</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1.0, 1.5, 2.0].map(m => (
                      <button
                        key={m}
                        onClick={() => setCalcMultiplier(m)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 6, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          border: calcMultiplier === m ? '1.5px solid #f97316' : '1px solid #e5e7eb',
                          background: calcMultiplier === m ? '#fff7ed' : '#fff',
                          color: calcMultiplier === m ? '#ea580c' : '#6b7280',
                        }}
                      >
                        {m}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Result */}
              <div style={{ background: calcResult != null ? '#f0fdf4' : '#f9fafb', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                {calcResult != null ? (
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#6b7280' }}>
                      {approveTarget.hours} ชม. × ฿{calcRate} × {calcMultiplier} =
                    </p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                      ฿{calcResult.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>กรอกอัตรา/ชม. เพื่อคำนวณ</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setApproveTarget(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={doApprove} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>✓ อนุมัติ OT</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <div style={modalBackdrop(!!rejectTarget)} onClick={() => setRejectTarget(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: '0 0 4px' }}>ไม่อนุมัติ OT</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>{rejectTarget.full_name} · {thDate(rejectTarget.date)} · {rejectTarget.hours} ชม.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>เหตุผล (ไม่บังคับ)</label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                rows={3}
                placeholder="ระบุเหตุผล..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRejectTarget(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={doReject} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>ยืนยันไม่อนุมัติ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
