// admin/src/pages/weekly-off/index.tsx
// ปฏิทินวันหยุด + วันลา — กดวันเพื่อดูรายละเอียด
import { useState, useMemo } from 'react'
import { useDemoStore } from '../../stores/demoStore'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { WeeklyOffBooking, WeeklyOffStatus, LeaveRequest } from '../../types'

const DAYS_TH   = ['อา','จ','อ','พ','พฤ','ศ','ส']
const DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const WO_STATUS: Record<WeeklyOffStatus,{label:string;color:string;bg:string;border:string}> = {
  PENDING:  { label:'รอพิจารณา', color:'#d97706', bg:'#fffbeb', border:'#fcd34d' },
  APPROVED: { label:'อนุมัติ',   color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
  REJECTED: { label:'ไม่อนุมัติ',color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
}
const LV_STATUS: Record<string,{label:string;color:string;bg:string;border:string}> = {
  PENDING:  { label:'รอพิจารณา', color:'#d97706', bg:'#fffbeb', border:'#fcd34d' },
  APPROVED: { label:'อนุมัติ',   color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
  REJECTED: { label:'ไม่อนุมัติ',color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
}

const BRANCH_COLORS = ['#f97316','#6366f1','#0891b2','#16a34a','#a21caf','#d97706','#dc2626']

// ── Date utils ───────────────────────────────────────────────────────────────
function getMondayOf(date: Date): Date {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0,0,0,0); return d
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function fmtTH(date: Date): string {
  return `${date.getDate()} ${MONTHS_TH[date.getMonth()]} ${date.getFullYear()+543}`
}
// ตรวจว่า dateStr อยู่ในช่วง [start, end]
function inRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end
}

type ModalMode = 'add' | 'edit' | null
const defaultForm = { employee_id:'', full_name:'', nickname:'', branch_name:'', day_of_week:1 }

// ── Day Detail state ─────────────────────────────────────────────────────────
interface DayInfo { date: Date; dateStr: string; dow: number }

export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const {
    weeklyOffBookings, addWeeklyOff, updateWeeklyOff, deleteWeeklyOff,
    leaveRequests, approveLeave, rejectLeave,
    employees, branches,
  } = useDemoStore()

  // ── Week nav ──────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const weekCols = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: d, dow: d.getDay(), dateStr: fmt(d) }
  })
  const prevWeek   = () => setWeekStart(d => addDays(d,-7))
  const nextWeek   = () => setWeekStart(d => addDays(d, 7))
  const toThisWeek = () => setWeekStart(getMondayOf(new Date()))
  const weekLabel  = `${fmtTH(weekStart)} – ${fmtTH(addDays(weekStart,6))}`

  // ── Filters ───────────────────────────────────────────────────────────────
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<WeeklyOffStatus|''>('')
  const [search, setSearch]             = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  // ── Day Detail (click a cell) ─────────────────────────────────────────────
  const [dayDetail, setDayDetail] = useState<DayInfo | null>(null)

  // ── Weekly-off bookings for this week ─────────────────────────────────────
  const weekStartStr = fmt(weekStart)
  const weekBookings = useMemo(() =>
    weeklyOffBookings.filter(w => {
      const wMon = fmt(getMondayOf(new Date(w.week_start)))
      if (wMon !== weekStartStr) return false
      if (branchFilter && w.branch_name !== branchFilter) return false
      if (statusFilter && w.status !== statusFilter) return false
      if (search && !w.full_name.includes(search) && !w.nickname.includes(search)) return false
      return true
    }), [weeklyOffBookings, weekStartStr, branchFilter, statusFilter, search])

  const byDay = useMemo(() => {
    const map: Record<number, WeeklyOffBooking[]> = {}
    for (let d = 0; d <= 6; d++) map[d] = []
    weekBookings.forEach(w => { map[w.day_of_week]?.push(w) })
    return map
  }, [weekBookings])

  // ── Leave requests overlapping this week ──────────────────────────────────
  const weekEndStr = fmt(addDays(weekStart, 6))
  const weekLeaves = useMemo(() =>
    leaveRequests.filter(lv =>
      lv.status !== 'REJECTED' &&
      lv.start_date <= weekEndStr && lv.end_date >= weekStartStr
    ), [leaveRequests, weekStartStr, weekEndStr])

  // leaves per dateStr
  const leaveByDate = useMemo(() => {
    const map: Record<string, LeaveRequest[]> = {}
    weekCols.forEach(({ dateStr }) => {
      map[dateStr] = weekLeaves.filter(lv => inRange(dateStr, lv.start_date, lv.end_date))
    })
    return map
  }, [weekLeaves, weekCols])

  // branch color
  const branchList  = [...new Set(weeklyOffBookings.map(w => w.branch_name))]
  const branchColor = (name: string) => BRANCH_COLORS[branchList.indexOf(name) % BRANCH_COLORS.length]

  const pendingCount = weekBookings.filter(w => w.status === 'PENDING').length
  const pendingLeave = weekLeaves.filter(lv => lv.status === 'PENDING').length

  // ── Modal (add/edit weekly-off) ───────────────────────────────────────────
  const [modal, setModal]             = useState<ModalMode>(null)
  const [editTarget, setEditTarget]   = useState<WeeklyOffBooking | null>(null)
  const [form, setForm]               = useState({ ...defaultForm })
  const [deleteTarget, setDeleteTarget] = useState<WeeklyOffBooking | null>(null)

  function openAdd(dow?: number) {
    setForm({ ...defaultForm, day_of_week: dow ?? dayDetail?.dow ?? 1 })
    setEditTarget(null); setModal('add')
  }
  function openEdit(w: WeeklyOffBooking) {
    setForm({ employee_id:w.employee_id, full_name:w.full_name, nickname:w.nickname, branch_name:w.branch_name, day_of_week:w.day_of_week })
    setEditTarget(w); setModal('edit')
  }
  function handleSave() {
    if (!form.full_name && !form.employee_id) { showToast('error','กรุณาเลือกพนักงาน'); return }
    if (modal === 'add') {
      addWeeklyOff({ id:`wo-${Date.now()}`, employee_id:form.employee_id, full_name:form.full_name, nickname:form.nickname, branch_name:form.branch_name, week_start:weekStartStr, day_of_week:form.day_of_week, status:'APPROVED', created_at:new Date().toISOString() })
      showToast('success',`เพิ่มวันหยุด ${form.nickname||form.full_name} วัน${DAYS_FULL[form.day_of_week]}`)
    } else if (editTarget) {
      updateWeeklyOff(editTarget.id, { full_name:form.full_name, nickname:form.nickname, branch_name:form.branch_name, day_of_week:form.day_of_week })
      showToast('success',`ย้ายวันหยุด ${form.nickname} → ${DAYS_FULL[form.day_of_week]}`)
    }
    setModal(null)
  }
  function handleApproveWO(w: WeeklyOffBooking) { updateWeeklyOff(w.id,{status:'APPROVED'}); showToast('success',`อนุมัติวันหยุด ${w.nickname}`) }
  function handleRejectWO(w: WeeklyOffBooking)  { updateWeeklyOff(w.id,{status:'REJECTED'}); showToast('info',`ไม่อนุมัติวันหยุด ${w.nickname}`) }
  function handleDelete() {
    if (!deleteTarget) return
    deleteWeeklyOff(deleteTarget.id); showToast('success',`ลบวันหยุด ${deleteTarget.nickname}`); setDeleteTarget(null)
  }
  function pickEmployee(empId: string) {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setForm(f => ({ ...f, employee_id:emp.id, full_name:emp.full_name, nickname:emp.nickname, branch_name:emp.branches[0]??'' }))
  }

  // ── Day cell click → open detail ─────────────────────────────────────────
  function handleCellClick(col: { date: Date; dateStr: string; dow: number }) {
    setDayDetail(prev => prev?.dateStr === col.dateStr ? null : { date: col.date, dateStr: col.dateStr, dow: col.dow })
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background:'#fff', borderRadius:14, border:'1px solid #f3f4f6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }
  const inputS: React.CSSProperties = { width:'100%', padding:'9px 12px', fontSize:'13px', borderRadius:8, border:'1px solid #e5e7eb', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const btnPrimary: React.CSSProperties = { padding:'9px 18px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }
  const btnSecondary: React.CSSProperties = { padding:'8px 14px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }

  // ── Day detail data ───────────────────────────────────────────────────────
  const detailWO     = dayDetail ? (byDay[dayDetail.dow] ?? []) : []
  const detailLeaves = dayDetail ? (leaveByDate[dayDetail.dateStr] ?? []) : []

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', fontFamily:'inherit', maxWidth:1200 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:isMobile ? 'flex-start':'center', justifyContent:'space-between', marginBottom:16, gap:10, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ margin:0, fontSize:isMobile ? '1.05rem':'1.35rem', fontWeight:800, color:'#111827' }}>
            📅 ปฏิทินวันหยุดสัปดาห์
          </h1>
          <p style={{ margin:'3px 0 0', fontSize:'0.78rem', color:'#6b7280' }}>
            กดวันในปฏิทินเพื่อดูรายชื่อผู้หยุด + วันลา
          </p>
        </div>
        <button onClick={() => openAdd()} style={{ ...btnPrimary, fontSize:isMobile ? '12px':'13px', padding:isMobile ? '8px 14px':'9px 18px' }}>
          ＋ เพิ่มวันหยุดด่วน
        </button>
      </div>

      {/* ── Week nav + filters ── */}
      <div style={{ ...card, padding:isMobile ? '12px':'14px 18px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={prevWeek} style={{ ...btnSecondary, padding:'7px 13px', fontSize:'1rem', lineHeight:1 }}>‹</button>
          <span style={{ fontWeight:700, fontSize:isMobile ? '0.82rem':'0.9rem', color:'#374151', flex:1, textAlign:'center' }}>
            {isMobile
              ? `${weekStart.getDate()} ${MONTHS_TH[weekStart.getMonth()]} – ${addDays(weekStart,6).getDate()} ${MONTHS_TH[addDays(weekStart,6).getMonth()]} ${weekStart.getFullYear()+543}`
              : weekLabel}
          </span>
          <button onClick={nextWeek} style={{ ...btnSecondary, padding:'7px 13px', fontSize:'1rem', lineHeight:1 }}>›</button>
          <button onClick={toThisWeek} style={{ ...btnSecondary, fontSize:'12px', color:'#f97316', borderColor:'#fed7aa', padding:'7px 12px' }}>สัปดาห์นี้</button>
          {isMobile && (
            <button onClick={() => setShowFilters(f => !f)} style={{ ...btnSecondary, fontSize:'12px', padding:'7px 12px', borderColor:showFilters ? '#f97316':'#e5e7eb', color:showFilters ? '#f97316':'#374151' }}>
              🔍 {showFilters ? 'ซ่อน':'กรอง'}
            </button>
          )}
        </div>
        {(!isMobile || showFilters) && (
          <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr':'repeat(3,1fr)', gap:8, marginTop:12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ/ชื่อเล่น..." style={{ ...inputS, gridColumn:isMobile ? 'span 2':undefined }} />
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={inputS}>
              <option value="">ทุกสาขา</option>
              {[...new Set(weeklyOffBookings.map(w => w.branch_name))].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={inputS}>
              <option value="">ทุกสถานะ</option>
              <option value="PENDING">รอพิจารณา</option>
              <option value="APPROVED">อนุมัติ</option>
              <option value="REJECTED">ไม่อนุมัติ</option>
            </select>
          </div>
        )}
        {(pendingCount > 0 || pendingLeave > 0) && (
          <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'#fffbeb', border:'1px solid #fcd34d', fontSize:'0.78rem', color:'#92400e', display:'flex', gap:12, flexWrap:'wrap' }}>
            {pendingCount > 0 && <span>⏳ วันหยุดรอพิจารณา <strong>{pendingCount}</strong> รายการ</span>}
            {pendingLeave > 0 && <span>🏖️ วันลารอพิจารณา <strong>{pendingLeave}</strong> รายการ</span>}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          ปฏิทิน
      ══════════════════════════════════════════════════════ */}
      <div style={{ ...card, padding:0, overflow:'hidden', marginBottom:16 }}>
        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #f3f4f6' }}>
          {weekCols.map(({ date, dow, dateStr }, idx) => {
            const isToday    = dateStr === fmt(new Date())
            const isSelected = dayDetail?.dateStr === dateStr
            const isSun      = dow === 0, isSat = dow === 6
            return (
              <div key={idx} onClick={() => handleCellClick({ date, dateStr, dow })}
                style={{
                  padding:isMobile ? '8px 4px':'10px 6px', textAlign:'center', cursor:'pointer',
                  borderRight: idx < 6 ? '1px solid #f3f4f6':'none',
                  background: isSelected ? '#fff7ed' : isToday ? '#fff7ed' : isSun||isSat ? '#fafafa':'#fff',
                  borderBottom: isSelected ? '2px solid #f97316':'2px solid transparent',
                  transition:'all .12s',
                }}>
                <div style={{ fontSize:isMobile ? '0.65rem':'0.7rem', color:isSun ? '#dc2626':isSat ? '#2563eb':'#9ca3af', fontWeight:600 }}>{DAYS_TH[dow]}</div>
                <div style={{ fontSize:isMobile ? '0.95rem':'1.05rem', fontWeight:800, color:isSelected ? '#f97316':isToday ? '#f97316':isSun ? '#dc2626':'#374151', lineHeight:1.2, marginTop:2 }}>
                  {date.getDate()}
                </div>
                {!isMobile && <div style={{ fontSize:'0.65rem', color:'#9ca3af' }}>{MONTHS_TH[date.getMonth()]}</div>}
                {isToday && <div style={{ width:5, height:5, borderRadius:'50%', background:'#f97316', margin:'3px auto 0' }} />}
              </div>
            )
          })}
        </div>

        {/* Summary row: count badges per day */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#fafafa', borderBottom:'1px solid #f3f4f6' }}>
          {weekCols.map(({ dateStr, dow }, idx) => {
            const woCount  = (byDay[dow] ?? []).length
            const lvCount  = (leaveByDate[dateStr] ?? []).length
            const woPend   = (byDay[dow] ?? []).filter(w => w.status === 'PENDING').length
            const lvPend   = (leaveByDate[dateStr] ?? []).filter(lv => lv.status === 'PENDING').length
            const isSelected = dayDetail?.dateStr === dateStr
            return (
              <div key={idx} onClick={() => handleCellClick({ date: weekCols[idx].date, dateStr, dow })}
                style={{ padding:'6px 4px', borderRight:idx < 6 ? '1px solid #f3f4f6':'none', cursor:'pointer', background:isSelected ? '#fff7ed':'#fafafa', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                {woCount > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'1px 5px', borderRadius:10, background:'#dcfce7', color:'#16a34a' }}>
                      🛌{woCount}
                    </span>
                    {woPend > 0 && <div style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b' }} />}
                  </div>
                )}
                {lvCount > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'1px 5px', borderRadius:10, background:'#ede9fe', color:'#7c3aed' }}>
                      🏖️{lvCount}
                    </span>
                    {lvPend > 0 && <div style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b' }} />}
                  </div>
                )}
                {woCount === 0 && lvCount === 0 && (
                  <div style={{ fontSize:'0.6rem', color:'#e5e7eb' }}>—</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Desktop: chip rows */}
        {!isMobile && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', minHeight:90 }}>
            {weekCols.map(({ dow, dateStr }, idx) => {
              const dayWO = byDay[dow] ?? []
              const dayLV = leaveByDate[dateStr] ?? []
              const isSun = dow === 0, isSat = dow === 6
              const isSelected = dayDetail?.dateStr === dateStr
              return (
                <div key={idx} onClick={() => handleCellClick(weekCols[idx])}
                  style={{ padding:'6px 5px', borderRight:idx<6 ? '1px solid #f3f4f6':'none', background:isSelected ? '#fff7ed':isSun||isSat ? '#fafafa':'#fff', cursor:'pointer', transition:'background .1s' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background='#fff7ed' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background=isSun||isSat ? '#fafafa':'#fff' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {dayWO.slice(0,2).map(w => {
                      const cfg = WO_STATUS[w.status]; const bc = branchColor(w.branch_name)
                      return (
                        <div key={w.id} onClick={e => { e.stopPropagation(); openEdit(w) }}
                          style={{ padding:'2px 5px', borderRadius:5, background:cfg.bg, border:`1px solid ${cfg.border}`, cursor:'pointer' }}
                          title={`${w.full_name} — ${cfg.label}`}>
                          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:bc, flexShrink:0 }} />
                            <span style={{ fontSize:'0.68rem', fontWeight:700, color:cfg.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:55 }}>
                              {w.nickname}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {dayLV.slice(0,1).map(lv => (
                      <div key={lv.id} style={{ padding:'2px 5px', borderRadius:5, background:'#f5f3ff', border:'1px solid #ddd6fe' }} title={`${lv.full_name} — ${lv.leave_type}`}>
                        <span style={{ fontSize:'0.67rem', fontWeight:600, color:'#7c3aed', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block', maxWidth:60 }}>
                          🏖️ {lv.nickname}
                        </span>
                      </div>
                    ))}
                    {(dayWO.length > 2 || dayLV.length > 1) && (
                      <div style={{ fontSize:'0.62rem', color:'#9ca3af', textAlign:'center' }}>
                        +{Math.max(0,dayWO.length-2)+Math.max(0,dayLV.length-1)} อีก
                      </div>
                    )}
                    {dayWO.length === 0 && dayLV.length === 0 && (
                      <div style={{ fontSize:'0.62rem', color:'#e5e7eb', textAlign:'center', marginTop:10 }}>—</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Day Detail Panel (inline below calendar) ── */}
        {dayDetail && (
          <DayDetailPanel
            dayInfo={dayDetail}
            woList={detailWO}
            leaveList={detailLeaves}
            isMobile={isMobile}
            branchColor={branchColor}
            onClose={() => setDayDetail(null)}
            onAddWO={() => openAdd(dayDetail.dow)}
            onEditWO={openEdit}
            onDeleteWO={setDeleteTarget}
            onApproveWO={handleApproveWO}
            onRejectWO={handleRejectWO}
            onApproveLeave={id => { approveLeave(id); showToast('success','อนุมัติวันลาแล้ว') }}
            onRejectLeave={id => { rejectLeave(id); showToast('info','ปฏิเสธวันลา') }}
          />
        )}
      </div>

      {/* ── List table (desktop) / cards (mobile) ── */}
      <div style={{ ...card, overflow:'hidden' }}>
        <div style={{ padding:isMobile ? '12px 14px':'14px 18px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:'0.88rem', color:'#374151' }}>
            🛌 วันหยุดสัปดาห์ ({weekBookings.length} รายการ)
          </span>
        </div>
        {weekBookings.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:'0.875rem' }}>ไม่มีรายการวันหยุดในสัปดาห์นี้</div>
        ) : isMobile ? (
          <div style={{ display:'flex', flexDirection:'column' }}>
            {weekBookings.map((w,i) => {
              const cfg = WO_STATUS[w.status]; const bc = branchColor(w.branch_name)
              return (
                <div key={w.id} style={{ padding:'12px 14px', borderTop: i > 0 ? '1px solid #f3f4f6':'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:bc+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, color:bc, flexShrink:0 }}>{w.nickname.slice(0,2)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#111827' }}>{w.nickname}</div>
                      <div style={{ fontSize:'0.72rem', color:'#9ca3af' }}>{w.full_name}</div>
                    </div>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, flexShrink:0 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
                    <span style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:6, background:bc+'18', color:bc, fontWeight:600 }}>{w.branch_name}</span>
                    <span style={{ fontSize:'0.78rem', color: w.day_of_week===0?'#dc2626':w.day_of_week===6?'#2563eb':'#374151', fontWeight:600 }}>วัน{DAYS_FULL[w.day_of_week]}</span>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {w.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleApproveWO(w)} style={{ flex:1, padding:'6px 8px', borderRadius:6, border:'1px solid #86efac', background:'#f0fdf4', color:'#16a34a', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✓ อนุมัติ</button>
                        <button onClick={() => handleRejectWO(w)}  style={{ flex:1, padding:'6px 8px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✗ ปฏิเสธ</button>
                      </>
                    )}
                    <button onClick={() => openEdit(w)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>✎ แก้ไข</button>
                    <button onClick={() => setDeleteTarget(w)} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['พนักงาน','สาขา','วัน','สถานะ','จัดการ'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, color:'#6b7280', fontSize:'0.78rem', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekBookings.map(w => {
                  const cfg = WO_STATUS[w.status]; const bc = branchColor(w.branch_name)
                  return (
                    <tr key={w.id} style={{ borderTop:'1px solid #f3f4f6' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:'50%', background:bc+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, color:bc, flexShrink:0 }}>{w.nickname.slice(0,2)}</div>
                          <div>
                            <div style={{ fontWeight:600, color:'#111827' }}>{w.nickname}</div>
                            <div style={{ fontSize:'0.75rem', color:'#9ca3af' }}>{w.full_name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}><span style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:6, background:bc+'18', color:bc, fontWeight:600 }}>{w.branch_name}</span></td>
                      <td style={{ padding:'10px 14px', fontWeight:600, color: w.day_of_week===0?'#dc2626':w.day_of_week===6?'#2563eb':'#374151' }}>วัน{DAYS_FULL[w.day_of_week]}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span></td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          {w.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleApproveWO(w)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #86efac', background:'#f0fdf4', color:'#16a34a', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✓ อนุมัติ</button>
                              <button onClick={() => handleRejectWO(w)}  style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✗ ไม่อนุมัติ</button>
                            </>
                          )}
                          <button onClick={() => openEdit(w)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>✎</button>
                          <button onClick={() => setDeleteTarget(w)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:isMobile ? 'flex-end':'center', justifyContent:'center', padding:isMobile ? 0:16 }}>
          <div style={{ background:'#fff', borderRadius:isMobile ? '20px 20px 0 0':16, padding:isMobile ? '20px 18px 28px':28, width:'100%', maxWidth:isMobile ? '100%':440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            {isMobile && <div style={{ width:36, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 16px' }} />}
            <h3 style={{ margin:'0 0 18px', fontSize:'1rem', fontWeight:800, color:'#111827' }}>
              {modal === 'add' ? '＋ เพิ่มวันหยุดด่วน' : '✎ แก้ไข / สลับวันหยุด'}
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>พนักงาน</label>
                <select value={form.employee_id} onChange={e => pickEmployee(e.target.value)} style={inputS}>
                  <option value="">— เลือกพนักงาน —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.nickname} ({e.full_name})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>สาขา</label>
                <select value={form.branch_name} onChange={e => setForm(f => ({ ...f, branch_name:e.target.value }))} style={inputS}>
                  <option value="">— เลือกสาขา —</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:8, display:'block' }}>วันหยุด</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
                  {DAYS_TH.map((d,i) => (
                    <button key={i} type="button" onClick={() => setForm(f => ({ ...f, day_of_week:i }))}
                      style={{ padding:isMobile ? '10px 4px':'8px 4px', borderRadius:8, border:'1.5px solid', borderColor:form.day_of_week===i ? '#f97316':'#e5e7eb', background:form.day_of_week===i ? '#fff7ed':'#fff', color:form.day_of_week===i ? '#f97316':i===0 ? '#dc2626':i===6 ? '#2563eb':'#374151', fontWeight:form.day_of_week===i ? 700:500, fontSize:isMobile ? '0.82rem':'0.8rem', cursor:'pointer', fontFamily:'inherit' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding:'8px 12px', borderRadius:8, background:'#f9fafb', fontSize:'0.8rem', color:'#6b7280' }}>
                📅 สัปดาห์: <strong style={{ color:'#374151' }}>{weekLabel}</strong>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20, flexDirection:isMobile ? 'column-reverse':'row', justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ ...btnSecondary, flex:isMobile ? 1:undefined, textAlign:'center' }}>ยกเลิก</button>
              <button onClick={handleSave} style={{ ...btnPrimary, flex:isMobile ? 1:undefined, textAlign:'center' }}>
                {modal === 'add' ? 'เพิ่มวันหยุด':'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:isMobile ? 'flex-end':'center', justifyContent:'center', padding:isMobile ? 0:16 }}>
          <div style={{ background:'#fff', borderRadius:isMobile ? '20px 20px 0 0':16, padding:isMobile ? '24px 20px 32px':28, maxWidth:380, width:'100%', textAlign:'center' }}>
            {isMobile && <div style={{ width:36, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 16px' }} />}
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', color:'#111827' }}>ยืนยันการลบ</h3>
            <p style={{ color:'#6b7280', fontSize:'0.875rem', marginBottom:20 }}>
              ลบวันหยุดของ <strong>{deleteTarget.nickname}</strong> วัน{DAYS_FULL[deleteTarget.day_of_week]}?
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexDirection:isMobile ? 'column-reverse':'row' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ ...btnSecondary, flex:isMobile ? 1:undefined }}>ยกเลิก</button>
              <button onClick={handleDelete} style={{ ...btnPrimary, background:'#dc2626', flex:isMobile ? 1:undefined }}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Day Detail Panel — แสดงรายชื่อวันหยุด + วันลา ของวันที่เลือก
// ══════════════════════════════════════════════════════════════════════════════
interface DayDetailPanelProps {
  dayInfo:      DayInfo
  woList:       WeeklyOffBooking[]
  leaveList:    LeaveRequest[]
  isMobile:     boolean
  branchColor:  (name: string) => string
  onClose:      () => void
  onAddWO:      () => void
  onEditWO:     (w: WeeklyOffBooking) => void
  onDeleteWO:   (w: WeeklyOffBooking) => void
  onApproveWO:  (w: WeeklyOffBooking) => void
  onRejectWO:   (w: WeeklyOffBooking) => void
  onApproveLeave: (id: string) => void
  onRejectLeave:  (id: string) => void
}
const MONTHS_TH2 = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_FULL2 = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

function DayDetailPanel({ dayInfo, woList, leaveList, isMobile, branchColor, onClose, onAddWO, onEditWO, onDeleteWO, onApproveWO, onRejectWO, onApproveLeave, onRejectLeave }: DayDetailPanelProps) {
  const { date, dow } = dayInfo
  const dayLabel = `วัน${DAYS_FULL2[dow]} ${date.getDate()} ${MONTHS_TH2[date.getMonth()]} ${date.getFullYear()+543}`
  const total = woList.length + leaveList.length
  const isSun = dow === 0, isSat = dow === 6

  return (
    <div style={{
      borderTop: '2px solid #f97316',
      background: '#fffbf7',
      padding: isMobile ? '14px 14px 18px' : '16px 20px 20px',
      animation: 'fadeSlideIn .2s ease',
    }}>
      <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Panel header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:isMobile ? '0.95rem':'1rem', color: isSun ? '#dc2626':isSat ? '#2563eb':'#111827' }}>
            {dayLabel}
          </div>
          <div style={{ fontSize:'0.75rem', color:'#9ca3af', marginTop:2 }}>
            {total === 0 ? 'ไม่มีรายการ' : `${total} รายการ — ${woList.length} วันหยุด · ${leaveList.length} วันลา`}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onAddWO}
            style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:700, fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
            ＋ เพิ่มวันหยุด
          </button>
          <button onClick={onClose}
            style={{ padding:'7px 10px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', color:'#9ca3af', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: isMobile ? 'flex':'grid', flexDirection: isMobile ? 'column':'column', gridTemplateColumns:!isMobile && woList.length > 0 && leaveList.length > 0 ? '1fr 1fr':'1fr', gap:12 }}>

        {/* ── Section: วันหยุดสัปดาห์ ── */}
        <section>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.05em' }}>🛌 วันหยุดสัปดาห์</span>
            <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:10, background:'#dcfce7', color:'#16a34a', fontWeight:700 }}>{woList.length}</span>
          </div>
          {woList.length === 0 ? (
            <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(0,0,0,0.03)', textAlign:'center', color:'#d1d5db', fontSize:'0.78rem' }}>ไม่มีรายการ</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {woList.map(w => {
                const cfg = WO_STATUS[w.status]; const bc = branchColor(w.branch_name)
                return (
                  <div key={w.id} style={{ background:'#fff', borderRadius:10, border:`1px solid ${cfg.border}`, padding:'10px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:w.status === 'PENDING' ? 8:0 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:bc+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.78rem', fontWeight:700, color:bc, flexShrink:0 }}>
                        {w.nickname.slice(0,2)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#111827' }}>{w.nickname}</div>
                        <div style={{ fontSize:'0.72rem', color:'#9ca3af', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                          <span>{w.full_name}</span>
                          <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:6, background:bc+'18', color:bc, fontWeight:600 }}>{w.branch_name}</span>
                        </div>
                      </div>
                      <span style={{ padding:'3px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, flexShrink:0 }}>{cfg.label}</span>
                    </div>
                    {w.status === 'PENDING' && (
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={() => onApproveWO(w)} style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #86efac', background:'#f0fdf4', color:'#16a34a', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✓ อนุมัติ</button>
                        <button onClick={() => onRejectWO(w)}  style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✗ ปฏิเสธ</button>
                        <button onClick={() => onEditWO(w)}   style={{ padding:'5px 9px', borderRadius:6, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>✎</button>
                        <button onClick={() => onDeleteWO(w)} style={{ padding:'5px 9px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>🗑</button>
                      </div>
                    )}
                    {w.status !== 'PENDING' && (
                      <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                        <button onClick={() => onEditWO(w)}   style={{ padding:'4px 9px', borderRadius:6, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>✎ แก้ไข</button>
                        <button onClick={() => onDeleteWO(w)} style={{ padding:'4px 9px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>🗑 ลบ</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Section: วันลา ── */}
        <section style={{ marginTop: isMobile ? 12:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.05em' }}>🏖️ วันลา</span>
            <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:10, background:'#ede9fe', color:'#7c3aed', fontWeight:700 }}>{leaveList.length}</span>
          </div>
          {leaveList.length === 0 ? (
            <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(0,0,0,0.03)', textAlign:'center', color:'#d1d5db', fontSize:'0.78rem' }}>ไม่มีวันลา</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {leaveList.map(lv => {
                const cfg = LV_STATUS[lv.status]
                const bc  = branchColor(lv.branch_name)
                const isMulti = lv.start_date !== lv.end_date
                return (
                  <div key={lv.id} style={{ background:'#fff', borderRadius:10, border:'1px solid #e9d5ff', padding:'10px 12px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.78rem', fontWeight:700, color:'#7c3aed', flexShrink:0 }}>
                        {lv.nickname.slice(0,2)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#111827' }}>{lv.nickname}</div>
                        <div style={{ fontSize:'0.72rem', color:'#9ca3af' }}>{lv.full_name}</div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4 }}>
                          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:6, background:lv.leave_type_color+'22'||'#f3f4f6', color:lv.leave_type_color||'#374151', fontWeight:700, border:`1px solid ${lv.leave_type_color}44` }}>
                            {lv.leave_type}
                            {lv.half_day_period && ` (${lv.half_day_period})`}
                          </span>
                          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:6, background:bc+'18', color:bc, fontWeight:600 }}>{lv.branch_name}</span>
                          {isMulti && (
                            <span style={{ fontSize:'0.68rem', color:'#9ca3af' }}>
                              {lv.start_date.slice(5)} – {lv.end_date.slice(5)} ({lv.days} วัน)
                            </span>
                          )}
                        </div>
                        {lv.reason && (
                          <div style={{ fontSize:'0.72rem', color:'#6b7280', marginTop:3, fontStyle:'italic' }}>"{lv.reason}"</div>
                        )}
                      </div>
                      <span style={{ padding:'3px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, flexShrink:0, whiteSpace:'nowrap' }}>{cfg.label}</span>
                    </div>
                    {lv.status === 'PENDING' && (
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={() => onApproveLeave(lv.id)} style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #86efac', background:'#f0fdf4', color:'#16a34a', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✓ อนุมัติวันลา</button>
                        <button onClick={() => onRejectLeave(lv.id)}  style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✗ ปฏิเสธ</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
