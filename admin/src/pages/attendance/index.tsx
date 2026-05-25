import { useState } from 'react'
import { MOCK_TODAY_ATTENDANCE } from '../../lib/mock'
import type { AttendanceRow, AttendanceStatus } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

const STATUS_LABEL: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  ON_TIME:    { label: 'มาปกติ',      color: '#16a34a', bg: '#dcfce7' },
  LATE_1:     { label: 'มาสาย',       color: '#d97706', bg: '#fef3c7' },
  LATE_2:     { label: 'สายมาก',      color: '#dc2626', bg: '#fee2e2' },
  ABSENT:     { label: 'ขาดงาน',      color: '#dc2626', bg: '#fee2e2' },
  LEAVE:      { label: 'ลาหยุด',      color: '#7c3aed', bg: '#ede9fe' },
  VACATION:   { label: 'ลาพักร้อน',   color: '#d97706', bg: '#fef3c7' },
  HALF_DAY:   { label: 'ลาครึ่งวัน',  color: '#7c3aed', bg: '#ede9fe' },
  WEEKLY_OFF: { label: 'หยุดประจำ',   color: '#64748b', bg: '#f1f5f9' },
  SAT_OFF:    { label: 'หยุดเสาร์',   color: '#64748b', bg: '#f1f5f9' },
  SUN_OFF:    { label: 'หยุดอาทิตย์', color: '#64748b', bg: '#f1f5f9' },
  HOLIDAY:    { label: 'วันหยุด',     color: '#0891b2', bg: '#e0f2fe' },
  MANAGER:    { label: 'ผู้บริหาร',   color: '#0891b2', bg: '#e0f2fe' },
}

function pad(n: number) { return String(n).padStart(2, '0') }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default function AttendancePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<AttendanceRow[]>(MOCK_TODAY_ATTENDANCE)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(todayStr())
  const [editModal, setEditModal] = useState<AttendanceRow | null>(null)
  const [logModal, setLogModal] = useState<AttendanceRow | null>(null)
  const [editForm, setEditForm] = useState({ check_in_time: '', check_out_time: '' })

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return !q || r.full_name.toLowerCase().includes(q) || r.nickname.toLowerCase().includes(q) || r.code.includes(q)
  })

  function openLog(row: AttendanceRow) {
    setEditForm({ check_in_time: '', check_out_time: '' })
    setLogModal(row)
  }
  function openEdit(row: AttendanceRow) {
    setEditForm({ check_in_time: row.check_in_time ?? '', check_out_time: row.check_out_time ?? '' })
    setEditModal(row)
  }
  function handleSaveLog() {
    if (!logModal || !editForm.check_in_time) return
    setRows(prev => prev.map(r => r.id === logModal.id ? { ...r, check_in_time: editForm.check_in_time, check_out_time: editForm.check_out_time || null, status: 'ON_TIME' } : r))
    showToast('success', `ลงเวลา ${logModal.full_name} สำเร็จแล้ว`)
    setLogModal(null)
  }
  function handleSaveEdit() {
    if (!editModal) return
    setRows(prev => prev.map(r => r.id === editModal.id ? { ...r, check_in_time: editForm.check_in_time || null, check_out_time: editForm.check_out_time || null } : r))
    showToast('success', `แก้ไขเวลา ${editModal.full_name} เรียบร้อยแล้ว`)
    setEditModal(null)
  }

  const timeInput: React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>📅 จัดการเวลาลงงานรายวัน</h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>ตรวจสอบ/แก้ไข เวลาเช็คอินรายวัน</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, ชื่อเล่น / รหัส" style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box' }} />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', flex: 1 }} />
          <button style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', flexShrink: 0 }}>↻</button>
        </div>
      </div>

      {/* Table or Cards */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isMobile ? (
          <div>
            {filtered.map((row, i) => {
              const s = STATUS_LABEL[row.status]
              const noTime = !row.check_in_time
              return (
                <div key={row.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{row.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{row.code} · {row.branch_name} · กะ {row.shift_no}</div>
                    </div>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      เข้า: {row.check_in_time
                        ? <span style={{ fontWeight: 700, color: '#1e40af' }}>{row.check_in_time}</span>
                        : <span style={{ color: '#d1d5db' }}>-</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      ออก: <span style={{ color: '#374151' }}>{row.check_out_time ?? '-'}</span>
                    </div>
                    {row.fine > 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>ค่าปรับ {row.fine} ฿</div>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                      {noTime
                        ? <button onClick={() => openLog(row)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #f97316', cursor: 'pointer', background: '#fff7ed', color: '#f97316', fontSize: '0.8rem', fontWeight: 600 }}>✏ ลงเวลา</button>
                        : <button onClick={() => openEdit(row)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#374151', fontSize: '0.8rem' }}>✏ แก้ไข</button>
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#dbeafe' }}>
                  {['พนักงาน','ชื่อเล่น','กะ','เวลาเข้า','เวลาออก','สถานะ','ค่าปรับ','จัดการ'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const s = STATUS_LABEL[row.status]
                  const noTime = !row.check_in_time
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{row.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.code}</div>
                      </td>
                      <td style={{ padding: '11px 14px', color: '#374151' }}>{row.nickname}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 600 }}>กะ {row.shift_no}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {row.check_in_time
                          ? <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 10px', fontWeight: 600 }}>{row.check_in_time}</span>
                          : <span style={{ color: '#d1d5db' }}>-</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#9ca3af' }}>{row.check_out_time ?? '-'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '11px 14px', color: row.fine > 0 ? '#dc2626' : '#9ca3af', fontWeight: row.fine > 0 ? 600 : 400 }}>
                        {row.fine > 0 ? `${row.fine} ฿` : '-'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {noTime
                          ? <button onClick={() => openLog(row)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #f97316', cursor: 'pointer', background: '#fff7ed', color: '#f97316', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>✏ ลงเวลา</button>
                          : <button onClick={() => openEdit(row)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>✏ แก้ไข</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log / Edit Modal — bottom sheet on mobile */}
      {(logModal || editModal) && (() => {
        const target = logModal ?? editModal!
        const isLog = !!logModal
        const save = isLog ? handleSaveLog : handleSaveEdit
        const close = () => { setLogModal(null); setEditModal(null) }
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }} onClick={close}>
            <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16, padding: '24px', width: isMobile ? '100%' : 380, paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 24 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>{isLog ? 'ลงเวลา' : 'แก้ไขเวลา'} — {target.full_name}</h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6b7280' }}>{target.code} · {target.branch_name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>เวลาเข้างาน</label>
                  <input type="time" value={editForm.check_in_time} onChange={e => setEditForm(f => ({ ...f, check_in_time: e.target.value }))} style={timeInput} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>เวลาออกงาน (ไม่บังคับ)</label>
                  <input type="time" value={editForm.check_out_time} onChange={e => setEditForm(f => ({ ...f, check_out_time: e.target.value }))} style={timeInput} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={close} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
                <button onClick={save} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 600 }}>บันทึก</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
