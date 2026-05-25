// admin/src/pages/report/index.tsx
import { useState } from 'react'
import { MOCK_REPORT, MOCK_BRANCHES, genEmployeeLog, MOCK_LEAVE_BALANCES, MOCK_TENANTS } from '../../lib/mock'
import type { ReportRow, AttendanceLogRow, AttendanceStatus } from '../../types'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useAuthStore } from '../../stores/authStore'
import { usePlanConfigStore } from '../../stores/planConfigStore'

const STATUS_LABEL: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  ON_TIME:    { label: 'ปกติ',        color: '#16a34a', bg: '#dcfce7' },
  LATE_1:     { label: 'สาย',         color: '#d97706', bg: '#fef3c7' },
  LATE_2:     { label: 'สายมาก',      color: '#dc2626', bg: '#fee2e2' },
  ABSENT:     { label: 'ขาด',         color: '#dc2626', bg: '#fee2e2' },
  LEAVE:      { label: 'ลา',          color: '#7c3aed', bg: '#ede9fe' },
  VACATION:   { label: 'พักร้อน',     color: '#d97706', bg: '#fef3c7' },
  HALF_DAY:   { label: 'ลาครึ่งวัน', color: '#7c3aed', bg: '#ede9fe' },
  WEEKLY_OFF: { label: 'หยุดประจำ',   color: '#64748b', bg: '#f1f5f9' },
  SAT_OFF:    { label: 'หยุดเสาร์',   color: '#94a3b8', bg: '#f8fafc' },
  SUN_OFF:    { label: 'หยุดอาทิตย์', color: '#94a3b8', bg: '#f8fafc' },
  HOLIDAY:    { label: 'วันหยุด',     color: '#0891b2', bg: '#e0f2fe' },
  MANAGER:    { label: 'ผู้บริหาร',   color: '#0891b2', bg: '#e0f2fe' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export default function ReportPage() {
  const isMobile = useIsMobile()
  const [branch, setBranch] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('2026-05-01')
  const [endDate, setEndDate] = useState('2026-05-31')
  const [calculated] = useState(true)
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null)
  const [logTab, setLogTab] = useState<'log'|'balance'>('log')
  const [exportToast, setExportToast] = useState<string | null>(null)

  const tenantId = useAuthStore(s => s.tenantId)
  const tenant = MOCK_TENANTS.find(t => t.id === tenantId) ?? MOCK_TENANTS[0]
  const features = usePlanConfigStore(s => s.getFeatures(tenant.plan))
  const canExport = features.report_export

  const filtered = MOCK_REPORT.filter(r => {
    const q = search.toLowerCase()
    return (!q || r.full_name.toLowerCase().includes(q) || r.nickname.toLowerCase().includes(q))
      && (!branch || r.branch_name === branch)
  })

  const totalFine = filtered.reduce((s, r) => s + r.total_fine, 0)
  const totalAffected = filtered.filter(r => r.total_fine > 0).length

  function showExportToast(msg: string) {
    setExportToast(msg)
    setTimeout(() => setExportToast(null), 3000)
  }

  function handleExportCSV() {
    if (!canExport) return
    const headers = ['รหัส','ชื่อ-สกุล','ชื่อเล่น','สาขา','ทำงาน(วัน)','สาย(วัน)','ขาด(วัน)','ลา(วัน)','หักสาย(฿)','หักขาด(฿)','รวมหัก(฿)']
    const rows = filtered.map(r => [r.code, r.full_name, r.nickname, r.branch_name, r.work_days, r.late_days, r.absent_days, r.leave_days, r.fine_late, r.fine_absent, r.total_fine])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `salary-report_${startDate}_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showExportToast(`✅ Export CSV (${filtered.length} แถว) เรียบร้อยแล้ว`)
  }

  function handleExportPDF() {
    if (!canExport) return
    showExportToast('🖨️ กำลังเปิดหน้าต่างพิมพ์...')
    setTimeout(() => window.print(), 300)
  }

  const logRows: AttendanceLogRow[] = detailRow ? genEmployeeLog(detailRow.id) : []
  const balance = detailRow ? MOCK_LEAVE_BALANCES.find(b => b.employee_id === detailRow.id) : null

  return (
    <div>
      {/* Export Toast */}
      {exportToast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 18px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 600, fontSize: '0.875rem' }}>
          {exportToast}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>💰 รายงานสรุปการหักเงินเดือน</h2>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {canExport ? (
            <>
              <button
                onClick={handleExportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #16a34a30', background: '#f0fdf4', color: '#15803d', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                {!isMobile && 'Export '}CSV
              </button>
              <button
                onClick={handleExportPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #dc262630', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17H17.01M17 13H17.01M13 13H13.01M9 13H9.01M9 17H9.01M13 17H13.01M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2M3 8h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                {!isMobile && 'Export '}PDF
              </button>
            </>
          ) : (
            <div
              title={`ฟีเจอร์ Export ต้องการแพ็กเกจ Professional ขึ้นไป (ปัจจุบัน: ${tenant.plan})`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#9ca3af', fontSize: '0.82rem', cursor: 'not-allowed', userSelect: 'none' }}
            >
              🔒 Export (ต้องการ Professional+)
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.875rem', padding: '9px 4px' }} />
            <span style={{ color: '#9ca3af' }}>→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.875rem', padding: '9px 4px' }} />
          </div>
        )}
        {isMobile && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem' }} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem' }} />
          </div>
        )}
        <select value={branch} onChange={e => setBranch(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff' }}>
          <option value="">ทุกสาขา</option>
          {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 160 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหา..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Summary Cards */}
      {calculated && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 8 : 14, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 6 }}>ยอดหักรวม</div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 700, color: '#f97316' }}>{totalFine.toLocaleString('th-TH')} ฿</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 6 }}>จำนวนที่ถูกหัก</div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 700, color: '#111827' }}>{totalAffected} คน</div>
          </div>
        </div>
      )}

      {/* Table or Cards */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isMobile ? (
          <div>
            {filtered.map((row, i) => (
              <div key={row.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: i%2===0?'#fff':'#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{row.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{row.code} · {row.branch_name}</div>
                  </div>
                  <button onClick={() => { setDetailRow(row); setLogTab('log') }} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #3b82f6', cursor: 'pointer', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>📋 Log</button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#374151', background: '#f9fafb', borderRadius: 6, padding: '2px 8px' }}>ทำงาน {row.work_days} วัน</span>
                  {row.late_days > 0 && <span style={{ fontSize: '0.72rem', color: '#d97706', background: '#fef3c7', borderRadius: 6, padding: '2px 8px' }}>สาย {row.late_days}</span>}
                  {row.absent_days > 0 && <span style={{ fontSize: '0.72rem', color: '#dc2626', background: '#fee2e2', borderRadius: 6, padding: '2px 8px' }}>ขาด {row.absent_days}</span>}
                  {row.total_fine > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>หัก {row.total_fine} ฿</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#dbeafe' }}>
                  {['รหัส','ชื่อ-สกุล','ชื่อเล่น','สาขา','สถิติ','หักสาย','หักขาด','รวมหัก','รายละเอียด'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: i%2===0?'#fff':'#fafafa' }}>
                    <td style={{ padding: '11px 14px', color: '#6b7280' }}>{row.code}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 500 }}>{row.full_name}</td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{row.nickname}</td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{row.branch_name}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: '0.78rem', lineHeight: 1.8 }}>
                        <span style={{ color: '#374151' }}>ทำงาน: {row.work_days}</span><br />
                        <span style={{ color: '#d97706' }}>สาย: {row.late_days}</span><br />
                        <span style={{ color: '#dc2626' }}>ขาด: {row.absent_days}</span><br />
                        <span style={{ color: '#7c3aed' }}>ลา: {row.leave_days}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: row.fine_late > 0 ? '#d97706' : '#9ca3af' }}>{row.fine_late > 0 ? `${row.fine_late} ฿` : '-'}</td>
                    <td style={{ padding: '11px 14px', color: row.fine_absent > 0 ? '#dc2626' : '#9ca3af' }}>{row.fine_absent > 0 ? `${row.fine_absent} ฿` : '-'}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: row.total_fine > 0 ? '#dc2626' : '#9ca3af' }}>{row.total_fine > 0 ? `${row.total_fine} ฿` : '0 ฿'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => { setDetailRow(row); setLogTab('log') }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #3b82f6', cursor: 'pointer', background: '#eff6ff', color: '#2563eb', fontSize: '0.78rem', fontWeight: 600 }}>📋 Log</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal — bottom sheet on mobile */}
      {detailRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 300, padding: isMobile ? 0 : 20 }} onClick={() => setDetailRow(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16, width: '100%', maxWidth: isMobile ? '100%' : 780, maxHeight: isMobile ? '88vh' : '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{detailRow.full_name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{detailRow.code} · {detailRow.branch_name}</div>
                </div>
                <button onClick={() => setDetailRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af', padding: 4 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { label: `ทำงาน ${detailRow.work_days} วัน`, color: '#374151', bg: '#f9fafb' },
                  { label: `สาย ${detailRow.late_days} วัน`, color: '#d97706', bg: '#fef3c7' },
                  { label: `ขาด ${detailRow.absent_days} วัน`, color: '#dc2626', bg: '#fee2e2' },
                  { label: `หัก ${detailRow.total_fine} ฿`, color: detailRow.total_fine > 0 ? '#dc2626' : '#6b7280', bg: detailRow.total_fine > 0 ? '#fee2e2' : '#f9fafb' },
                ].map(p => <span key={p.label} style={{ fontSize: '0.72rem', fontWeight: 600, color: p.color, background: p.bg, borderRadius: 99, padding: '3px 10px' }}>{p.label}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid #e5e7eb' }}>
                {([['log','📋 Log'],['balance','💳 โควต้า']] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => setLogTab(tab)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', background: 'none', fontSize: '0.85rem', fontWeight: 600, color: logTab === tab ? '#2563eb' : '#6b7280', borderBottom: logTab === tab ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -1 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {logTab === 'log' && (
                isMobile ? (
                  <div>
                    {logRows.map((r) => {
                      const s = STATUS_LABEL[r.status]
                      const isOff = ['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY'].includes(r.status)
                      const d = new Date(r.date)
                      return (
                        <div key={r.date} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', opacity: isOff ? 0.5 : 1, background: isOff ? '#fafafa' : '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{d.getDate()} {MONTHS_TH[d.getMonth()]} <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 400 }}>({r.day_th})</span></div>
                            <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>{s.label}</span>
                          </div>
                          {!isOff && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                              <span>เข้า: <strong style={{ color: r.check_in_time ? '#1e40af' : '#9ca3af' }}>{r.check_in_time ?? '-'}</strong></span>
                              <span>ออก: <strong>{r.check_out_time ?? '-'}</strong></span>
                              {r.late_minutes > 0 && <span style={{ color: '#d97706' }}>สาย {r.late_minutes} นาที</span>}
                              {r.fine > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.fine} ฿</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        {['วันที่','วัน','กะ','เข้างาน','ออกงาน','นาทีสาย','สถานะ','ค่าปรับ','หมายเหตุ'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logRows.map((r, i) => {
                        const s = STATUS_LABEL[r.status]
                        const isOff = ['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY'].includes(r.status)
                        const d = new Date(r.date)
                        return (
                          <tr key={r.date} style={{ borderBottom: '1px solid #f3f4f6', opacity: isOff ? 0.5 : 1, background: isOff ? '#fafafa' : i%2===0?'#fff':'#fdfdfd' }}>
                            <td style={{ padding: '8px 12px', color: '#374151', whiteSpace: 'nowrap' }}>{d.getDate()} {MONTHS_TH[d.getMonth()]}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7280' }}>{r.day_th}</td>
                            <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{r.shift_no ? `กะ ${r.shift_no}` : '-'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {r.check_in_time ? <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{r.check_in_time}</span> : <span style={{ color: '#d1d5db' }}>-</span>}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#374151' }}>{r.check_out_time ?? '-'}</td>
                            <td style={{ padding: '8px 12px', color: r.late_minutes > 0 ? '#d97706' : '#9ca3af' }}>{r.late_minutes > 0 ? `${r.late_minutes} นาที` : '-'}</td>
                            <td style={{ padding: '8px 12px' }}><span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</span></td>
                            <td style={{ padding: '8px 12px', color: r.fine > 0 ? '#dc2626' : '#9ca3af', fontWeight: r.fine > 0 ? 600 : 400 }}>{r.fine > 0 ? `${r.fine} ฿` : '-'}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '0.75rem' }}>{r.note || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {logTab === 'balance' && (
                <div style={{ padding: '16px' }}>
                  {balance ? (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'ลาป่วย',    used: balance.sick_used,       quota: balance.sick_quota,       color: '#16a34a', bg: '#dcfce7' },
                        { label: 'ลากิจ',     used: balance.personal_used,   quota: balance.personal_quota,   color: '#2563eb', bg: '#dbeafe' },
                        { label: 'ลาพักร้อน', used: balance.vacation_used,   quota: balance.vacation_quota,   color: '#d97706', bg: '#fef3c7' },
                        { label: 'หยุดชดเชย', used: balance.compensate_used, quota: balance.compensate_quota, color: '#7c3aed', bg: '#ede9fe' },
                      ].map(item => {
                        const pct = item.quota > 0 ? Math.round((item.used / item.quota) * 100) : 0
                        return (
                          <div key={item.label} style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{item.label}</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color }}>{item.used}/{item.quota}</span>
                            </div>
                            <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6 }}>
                              <div style={{ background: item.color, borderRadius: 99, height: 6, width: `${pct}%` }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 5 }}>คงเหลือ {item.quota - item.used} วัน</div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>ไม่มีข้อมูล</div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', paddingBottom: isMobile ? 'max(12px,env(safe-area-inset-bottom))' : 12 }}>
              <button onClick={() => setDetailRow(null)} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
