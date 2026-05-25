import { useState } from 'react'
import { MOCK_OT_REQUESTS, MOCK_BRANCHES } from '../../lib/mock'
import type { OtRequest, OtStatus } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

const STATUS_CFG: Record<OtStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา',  color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#15803d', bg: '#dcfce7' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#dc2626', bg: '#fee2e2' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) { const d = new Date(s); return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}` }

const card: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }

export default function OtPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<OtRequest[]>(MOCK_OT_REQUESTS)
  const [statusFilter, setStatusFilter] = useState<OtStatus | ''>('')
  const [branchFilter, setBranchFilter] = useState('')
  const [rejectTarget, setRejectTarget] = useState<OtRequest | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [approveTarget, setApproveTarget] = useState<OtRequest | null>(null)

  const filtered = rows.filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    (!branchFilter || r.branch_name === branchFilter)
  )
  const pending = rows.filter(r => r.status === 'PENDING').length
  const approvedRows = rows.filter(r => r.status === 'APPROVED')
  const totalHrs = approvedRows.reduce((s, r) => s + r.hours, 0)
  const totalAmt = approvedRows.reduce((s, r) => s + r.amount, 0)

  const doApprove = () => {
    if (!approveTarget) return
    setRows(prev => prev.map(r => r.id === approveTarget.id ? { ...r, status: 'APPROVED' } : r))
    showToast('success', `อนุมัติ OT ของ "${approveTarget.full_name}" เรียบร้อยแล้ว`)
    setApproveTarget(null)
  }
  const doReject = () => {
    if (!rejectTarget) return
    setRows(prev => prev.map(r => r.id === rejectTarget.id ? { ...r, status: 'REJECTED' } : r))
    showToast('info', `ไม่อนุมัติ OT ของ "${rejectTarget.full_name}"`)
    setRejectTarget(null)
    setRejectNote('')
  }

  const modalStyle = (open: boolean): React.CSSProperties => ({
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: open ? 'flex' : 'none',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center', zIndex: 200,
  })
  const modalBox: React.CSSProperties = {
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : 16,
    padding: '24px',
    width: isMobile ? '100%' : 380,
    paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 8 : 12 }}>
        {[
          { label: 'รอพิจารณา', value: pending, unit: 'รายการ', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'ชม. OT อนุมัติ', value: totalHrs, unit: 'ชม.', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
          { label: 'ยอด OT รวม', value: totalAmt.toLocaleString(), unit: '฿', color: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: isMobile ? '12px' : '16px 18px', border: `1px solid ${s.border}`, background: s.bg }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', fontWeight: 500 }}>{s.label}</p>
            <p style={{ fontSize: isMobile ? '1.3rem' : '24px', fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>
              {s.value} <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s as any)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: '12px', cursor: 'pointer', fontWeight: 500, border: statusFilter === s ? '1.5px solid #f97316' : '1px solid #e5e7eb', background: statusFilter === s ? '#fff7ed' : '#fff', color: statusFilter === s ? '#ea580c' : '#4b5563' }}>
            {s === '' ? 'ทุกสถานะ' : STATUS_CFG[s as OtStatus].label}{s === 'PENDING' && pending > 0 ? ` (${pending})` : ''}
          </button>
        ))}
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '12px', background: '#fff', cursor: 'pointer', marginLeft: isMobile ? 0 : 'auto' }}>
          <option value="">ทุกสาขา</option>
          {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {/* Table or Cards */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {isMobile ? (
          <div>
            {filtered.map((r, i) => {
              const s = STATUS_CFG[r.status]
              return (
                <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: r.status === 'PENDING' ? '#fffbf5' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{r.full_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{r.branch_name} · {thDate(r.date)}</div>
                    </div>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#374151' }}>⏰ {r.start_time}–{r.end_time} ({r.hours} ชม.)</span>
                    <span style={{ fontSize: '0.78rem', color: '#374151' }}>× {r.multiplier}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c2410c' }}>{r.amount.toLocaleString()} ฿</span>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button onClick={() => setApproveTarget(r)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#15803d', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>✓ อนุมัติ</button>
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
                  {['พนักงาน','สาขา','วันที่','เวลา','ชม.','ตัวคูณ','ยอดเงิน','หมายเหตุ','สถานะ','จัดการ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const s = STATUS_CFG[r.status]
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
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#c2410c', whiteSpace: 'nowrap' }}>{r.amount.toLocaleString()} ฿</td>
                      <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '12px', maxWidth: 180 }}>{r.note || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {r.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setApproveTarget(r)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#15803d', color: '#fff', fontSize: '11px', fontWeight: 600 }}>✓ อนุมัติ</button>
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

      {/* Approve confirm */}
      {approveTarget && (
        <div style={modalStyle(!!approveTarget)} onClick={() => setApproveTarget(null)}>
          <div style={{ ...modalBox, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="24" height="24" fill="none" stroke="#15803d" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: '0 0 6px' }}>ยืนยันอนุมัติ OT?</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 6px' }}>{approveTarget.full_name}</p>
            <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 20px' }}>
              {thDate(approveTarget.date)} · {approveTarget.hours} ชม. · <strong style={{ color: '#c2410c' }}>{approveTarget.amount.toLocaleString()} ฿</strong>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setApproveTarget(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={doApprove} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>อนุมัติ OT</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={modalStyle(!!rejectTarget)} onClick={() => setRejectTarget(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: '0 0 4px' }}>ไม่อนุมัติ OT</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 18px' }}>{rejectTarget.full_name} · {thDate(rejectTarget.date)} · {rejectTarget.hours} ชม.</p>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>เหตุผล (ไม่บังคับ)</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} placeholder="ระบุเหตุผล..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
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
