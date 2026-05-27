import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_BRANCHES } from '../../lib/mock'
import type { Employee, Department } from '../../types'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useDemoStore } from '../../stores/demoStore'

type ModalMode = 'add' | 'edit' | null

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  outline: 'none', boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}

// ── รหัสพนักงาน utility ───────────────────────────────────────────────────────
function beYear(adDateStr: string): string {
  if (!adDateStr) return ''
  const y = parseInt(adDateStr.split('-')[0])
  return String(y + 543).slice(-2)  // 2 หลักท้าย พ.ศ.
}

function nextRunNumber(employees: Employee[], yy: string, deptCode: string): number {
  const prefix = `${yy}-${deptCode}-`
  const existing = employees
    .map(e => e.code)
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.split('-')[2] ?? '0'))
    .filter(n => !isNaN(n))
  return existing.length > 0 ? Math.max(...existing) + 1 : 1
}

function generateCode(employees: Employee[], hireDate: string, deptCode: string): string {
  const yy = beYear(hireDate)
  if (!yy || !deptCode) return ''
  const run = nextRunNumber(employees, yy, deptCode.padStart(2, '0'))
  return `${yy}-${deptCode.padStart(2, '0')}-${String(run).padStart(3, '0')}`
}

export default function EmployeePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // ── Demo store (ข้อมูลเก็บใน localStorage ไม่หายตอน refresh) ──────
  const {
    employees, addEmployee, updateEmployee, deleteEmployee,
    departments, addDepartment, updateDepartment, deleteDepartment,
  } = useDemoStore()

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [lineFilter, setLineFilter] = useState<'' | 'linked' | 'unlinked'>('')
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'INACTIVE'>('')

  const [modal, setModal] = useState<ModalMode>(null)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [form, setForm] = useState({ full_name: '', nickname: '', dept_id: '', phone: '', branches: [] as string[], hire_date: '', pay_type: 'MONTHLY' as 'MONTHLY'|'DAILY'|'HOURLY', hourly_rate: '' })

  // Department management modal
  const [deptModal, setDeptModal] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '' })
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteDept, setDeleteDept] = useState<Department | null>(null)

  // Computed: selected department object
  const selectedDept = departments.find(d => d.id === form.dept_id)

  // Auto-generated code preview (only for add mode)
  const codePreview = useMemo(() => {
    if (modal !== 'add' || !form.hire_date || !selectedDept) return ''
    return generateCode(employees, form.hire_date, selectedDept.code)
  }, [modal, form.hire_date, selectedDept, employees])

  const unlinkedCount = employees.filter(e => !e.line_user_id).length

  function handleSendInvite(e: Employee) {
    showToast('success', `ส่งลิงก์ผูก Line ให้ "${e.full_name}" ทาง Line OA แล้ว`)
  }

  // Filter
  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || e.full_name.toLowerCase().includes(q) || e.nickname.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    const matchBranch = !branchFilter || e.branches.includes(branchFilter)
    const matchDept = !deptFilter || e.department === deptFilter
    const matchLine = lineFilter === '' || (lineFilter === 'linked' ? !!e.line_user_id : !e.line_user_id)
    const matchStatus = statusFilter === '' || e.status === statusFilter
    return matchQ && matchBranch && matchDept && matchLine && matchStatus
  })

  // ── Employee CRUD ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ full_name: '', nickname: '', dept_id: departments[0]?.id ?? '', phone: '', branches: [], hire_date: '', pay_type: 'MONTHLY', hourly_rate: '' })
    setEditTarget(null)
    setModal('add')
  }
  const openEdit = (e: Employee) => {
    const dept = departments.find(d => d.name === e.department) ?? departments[0]
    setForm({ full_name: e.full_name, nickname: e.nickname, dept_id: dept?.id ?? '', phone: e.phone, branches: [...e.branches], hire_date: e.hire_date, pay_type: e.pay_type, hourly_rate: e.hourly_rate ? String(e.hourly_rate) : '' })
    setEditTarget(e)
    setModal('edit')
  }
  const handleSave = () => {
    if (!form.full_name.trim()) return
    const dept = departments.find(d => d.id === form.dept_id)
    if (modal === 'add') {
      const code = generateCode(employees, form.hire_date, dept?.code ?? '00')
      addEmployee({
        id: `e${Date.now()}`,
        code,
        full_name: form.full_name,
        nickname: form.nickname,
        department: dept?.name ?? '',
        phone: form.phone,
        branches: form.branches,
        hire_date: form.hire_date,
        status: 'ACTIVE' as const,
        line_user_id: null,
        pay_type: form.pay_type,
        hourly_rate: form.pay_type === 'HOURLY' && form.hourly_rate ? Number(form.hourly_rate) : undefined,
      })
      showToast('success', `เพิ่มพนักงาน "${form.full_name}" รหัส ${code}`)
    } else if (editTarget) {
      updateEmployee(editTarget.id, {
        full_name: form.full_name,
        nickname: form.nickname,
        department: dept?.name ?? editTarget.department,
        phone: form.phone,
        branches: form.branches,
        hire_date: form.hire_date,
        pay_type: form.pay_type,
        hourly_rate: form.pay_type === 'HOURLY' && form.hourly_rate ? Number(form.hourly_rate) : undefined,
      })
      showToast('success', `บันทึกข้อมูล "${form.full_name}" เรียบร้อยแล้ว`)
    }
    setModal(null)
  }
  const handleDelete = () => {
    if (!deleteTarget) return
    deleteEmployee(deleteTarget.id)
    showToast('success', `ลบพนักงาน "${deleteTarget.full_name}" เรียบร้อยแล้ว`)
    setDeleteTarget(null)
  }
  const toggleBranch = (b: string) => setForm(f => ({
    ...f, branches: f.branches.includes(b) ? f.branches.filter(x => x !== b) : [...f.branches, b]
  }))

  // ── Department CRUD ────────────────────────────────────────────────────────
  const nextDeptCode = () => {
    const max = departments.reduce((m, d) => Math.max(m, parseInt(d.code) || 0), 0)
    return String(max + 1).padStart(2, '0')
  }
  const openAddDept = () => { setDeptForm({ name: '' }); setEditDept(null) }
  const openEditDept = (d: Department) => { setDeptForm({ name: d.name }); setEditDept(d) }
  const handleSaveDept = () => {
    const name = deptForm.name.trim()
    if (!name) return
    if (editDept) {
      updateDepartment(editDept.id, { name })
      // sync employees ที่อยู่ในแผนกนี้
      employees.filter(e => e.department === editDept.name)
               .forEach(e => updateEmployee(e.id, { department: name }))
      showToast('success', `เปลี่ยนชื่อแผนกเป็น "${name}" แล้ว`)
    } else {
      const code = nextDeptCode()
      addDepartment({ id: `dep-${Date.now()}`, code, name })
      showToast('success', `เพิ่มแผนก "${name}" (รหัส ${code}) เรียบร้อยแล้ว`)
    }
    setEditDept(null)
    setDeptForm({ name: '' })
  }
  const handleDeleteDept = () => {
    if (!deleteDept) return
    const inUse = employees.some(e => e.department === deleteDept.name)
    if (inUse) {
      showToast('error', `ไม่สามารถลบได้ มีพนักงานอยู่ในแผนกนี้`)
      setDeleteDept(null)
      return
    }
    deleteDepartment(deleteDept.id)
    showToast('success', `ลบแผนก "${deleteDept.name}" เรียบร้อยแล้ว`)
    setDeleteDept(null)
  }

  const avatarColor = (id: string) => `hsl(${id.charCodeAt(1) * 30 % 360}, 60%, 88%)`
  const avatarText  = (id: string) => `hsl(${id.charCodeAt(1) * 30 % 360}, 60%, 35%)`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          พนักงานทั้งหมด <strong style={{ color: '#111827' }}>{employees.length} คน</strong>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setDeptModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px' }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            {!isMobile && 'จัดการ'}แผนก
          </button>
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            เพิ่มพนักงาน
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 200 }}>
          <svg width="14" height="14" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัส..." style={{ ...inputStyle, paddingLeft: 32, background: '#fff' }} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', padding: '8px 12px', background: '#fff' }}>
          <option value="">ทุกแผนก</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', padding: '8px 12px', background: '#fff' }}>
          <option value="">ทุกสาขา</option>
          {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {/* Line filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['', 'linked', 'unlinked'] as const).map(f => {
          const labels: Record<string, string> = {
            '': `ทั้งหมด (${employees.length})`,
            'linked': `✅ ผูก Line แล้ว (${employees.length - unlinkedCount})`,
            'unlinked': `⚠️ ยังไม่ผูก (${unlinkedCount})`,
          }
          const isActive = lineFilter === f
          const isWarn = f === 'unlinked'
          return (
            <button key={f} onClick={() => setLineFilter(f)}
              style={{
                padding: '5px 13px', borderRadius: 99, fontSize: '12px', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                border: isActive ? `1.5px solid ${isWarn ? '#f59e0b' : '#10b981'}` : '1.5px solid #e5e7eb',
                background: isActive ? (isWarn ? '#fef3c7' : '#d1fae5') : '#fff',
                color: isActive ? (isWarn ? '#92400e' : '#065f46') : '#6b7280',
              }}
            >{labels[f]}</button>
          )
        })}
        {unlinkedCount > 0 && lineFilter !== 'unlinked' && (
          <span style={{ fontSize: '11px', color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚠ พนักงาน {unlinkedCount} คนยังไม่สามารถเช็คอิน LIFF ได้
          </span>
        )}
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['', 'ACTIVE', 'INACTIVE'] as const).map(f => {
          const labels: Record<string, string> = {
            '': `ทั้งหมด`,
            'ACTIVE': `🟢 ทำงานอยู่`,
            'INACTIVE': `🔴 พักงาน`,
          }
          const isActive = statusFilter === f
          return (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{
                padding: '5px 13px', borderRadius: 99, fontSize: '12px', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                border: isActive ? `1.5px solid ${f === 'ACTIVE' ? '#10b981' : f === 'INACTIVE' ? '#dc2626' : '#f97316'}` : '1.5px solid #e5e7eb',
                background: isActive ? (f === 'ACTIVE' ? '#d1fae5' : f === 'INACTIVE' ? '#fee2e2' : '#fff7ed') : '#fff',
                color: isActive ? (f === 'ACTIVE' ? '#065f46' : f === 'INACTIVE' ? '#991b1b' : '#ea580c') : '#6b7280',
              }}
            >{labels[f]}</button>
          )
        })}
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {isMobile ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {filtered.map((e, i) => (
            <div key={e.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: avatarColor(e.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: avatarText(e.id) }}>
                {e.nickname.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{e.full_name}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>{e.code}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 1 }}>{e.department}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: e.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2', color: e.status === 'ACTIVE' ? '#059669' : '#dc2626' }}>
                    {e.status === 'ACTIVE' ? '🟢 ทำงาน' : '🔴 พักงาน'}
                  </span>
                  {(() => {
                    const cfg = { MONTHLY: { label: 'รายเดือน', bg: '#eff6ff', color: '#1d4ed8' }, DAILY: { label: 'รายวัน', bg: '#f0fdf4', color: '#15803d' }, HOURLY: { label: 'รายชม.', bg: '#fef3c7', color: '#92400e' } }[e.pay_type] ?? { label: 'รายเดือน', bg: '#eff6ff', color: '#1d4ed8' }
                    return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {e.branches.map(b => (
                    <span key={b} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 99, background: '#fff7ed', color: '#c2410c' }}>{b}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
                {e.line_user_id ? (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#d1fae5', color: '#059669' }}>✓ Line</span>
                ) : (
                  <button onClick={() => handleSendInvite(e)} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer' }}>⚠ ส่งลิงก์</button>
                )}
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => navigate(`/employee/${e.id}`)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #10b98120', background: '#10b98110', color: '#059669', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>ดู</button>
                  <button onClick={() => openEdit(e)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #3b82f620', background: '#3b82f610', color: '#3b82f6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>แก้ไข</button>
                  <button onClick={() => setDeleteTarget(e)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ef444420', background: '#ef444410', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>ลบ</button>
                  <button onClick={() => updateEmployee(e.id, { status: e.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #6b728020', background: '#6b728010', color: '#374151', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>เปิด/ปิด</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>ไม่พบพนักงาน</div>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                  {['รหัส','ชื่อ – สกุล','แผนก','สาขา','โทร','วันเข้างาน','ประเภท','Line','สถานะ','จัดการ'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', color: '#374151' }}>{e.code}</span>
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: avatarColor(e.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: avatarText(e.id) }}>{e.nickname.slice(0, 2)}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{e.full_name}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{e.nickname}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const d = departments.find(d => d.name === e.department)
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {d && <span style={{ fontFamily: 'monospace', fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>{d.code}</span>}
                            <span>{e.department}</span>
                          </div>
                        )
                      })()}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 220 }}>
                        {e.branches.map(b => <span key={b} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 99, background: '#fff7ed', color: '#c2410c', fontWeight: 500 }}>{b}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12px' }}>{e.phone}</td>
                    <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap', fontSize: '12px' }}>{e.hire_date.split('-').reverse().join('/')}</td>
                    {/* Pay type badge */}
                    <td style={{ padding: '11px 14px' }}>
                      {(() => {
                        const cfg = { MONTHLY: { label: 'รายเดือน', bg: '#eff6ff', color: '#1d4ed8' }, DAILY: { label: 'รายวัน', bg: '#f0fdf4', color: '#15803d' }, HOURLY: { label: 'รายชั่วโมง', bg: '#fef3c7', color: '#92400e' } }[e.pay_type] ?? { label: 'รายเดือน', bg: '#eff6ff', color: '#1d4ed8' }
                        return <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                      })()}
                    </td>
                    {/* Line status */}
                    <td style={{ padding: '11px 14px' }}>
                      {e.line_user_id ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#d1fae5', color: '#059669', whiteSpace: 'nowrap' }}>✓ ผูกแล้ว</span>
                      ) : (
                        <button onClick={() => handleSendInvite(e)} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer', whiteSpace: 'nowrap' }}>⚠ ส่งลิงก์</button>
                      )}
                    </td>
                    {/* Status badge */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: e.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2', color: e.status === 'ACTIVE' ? '#059669' : '#dc2626', whiteSpace: 'nowrap' }}>
                        {e.status === 'ACTIVE' ? '🟢 ทำงาน' : '🔴 พักงาน'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => navigate(`/employee/${e.id}`)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #10b98130', background: '#10b98110', color: '#059669', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>ดู</button>
                        <button onClick={() => openEdit(e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #3b82f630', background: '#3b82f610', color: '#3b82f6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>แก้ไข</button>
                        <button onClick={() => setDeleteTarget(e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>ลบ</button>
                        <button onClick={() => updateEmployee(e.id, { status: e.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #6b728030', background: '#6b728010', color: '#374151', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>เปิด/ปิด</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่พบพนักงาน</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add/Edit Employee Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16, width: isMobile ? '100%' : 520, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>
                {modal === 'add' ? 'เพิ่มพนักงานใหม่' : `แก้ไข: ${editTarget?.full_name}`}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* รหัสพนักงาน preview */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: 4 }}>รหัสพนักงาน (สร้างอัตโนมัติ)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {modal === 'add' ? (
                    codePreview
                      ? <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, color: '#1d4ed8', letterSpacing: 2 }}>{codePreview}</span>
                      : <span style={{ fontSize: '13px', color: '#9ca3af' }}>เลือกวันเข้างาน + แผนกเพื่อดูรหัส</span>
                  ) : (
                    <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, color: '#374151', letterSpacing: 2 }}>{editTarget?.code}</span>
                  )}
                  <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>พศ-แผนก-เลขรัน</span>
                </div>
                {codePreview && modal === 'add' && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>
                      <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{codePreview.split('-')[0]}</span> = พ.ศ.{beYear(form.hire_date) ? parseInt(beYear(form.hire_date)) + 2500 : ''}
                    </span>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>
                      <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{codePreview.split('-')[1]}</span> = {selectedDept?.name}
                    </span>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>
                      <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{codePreview.split('-')[2]}</span> = ลำดับที่
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Field label="ชื่อ – สกุล *">
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="สมชาย ใจดี" style={inputStyle} />
                </Field>
                <Field label="ชื่อเล่น">
                  <input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="ชาย" style={inputStyle} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Field label="แผนก">
                  <select value={form.dept_id} onChange={e => setForm(f => ({ ...f, dept_id: e.target.value }))} style={{ ...inputStyle, background: '#fff' }}>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="วันที่เริ่มงาน">
                  <input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} style={{ ...inputStyle }} />
                </Field>
              </div>

              <Field label="เบอร์โทรศัพท์">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08x-xxx-xxxx" style={{ ...inputStyle, width: 'auto' }} />
              </Field>

              <Field label="สาขาที่สังกัด">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {MOCK_BRANCHES.map(b => {
                    const sel = form.branches.includes(b.name)
                    return (
                      <button key={b.id} type="button" onClick={() => toggleBranch(b.name)}
                        style={{ padding: '6px 12px', borderRadius: 99, fontSize: '12px', cursor: 'pointer', border: `1.5px solid ${sel ? '#f97316' : '#e5e7eb'}`, background: sel ? '#fff7ed' : '#fff', color: sel ? '#ea580c' : '#4b5563', fontWeight: sel ? 600 : 400 }}>
                        {b.name}
                      </button>
                    )
                  })}
                </div>
              </Field>

              {/* ── ประเภทพนักงาน ── */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: 10 }}>ประเภทพนักงาน</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {([
                    { value: 'MONTHLY', label: '📅 รายเดือน',    desc: 'เงินเดือนประจำ',    bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                    { value: 'DAILY',   label: '📆 รายวัน',      desc: 'คิดตามวันที่มา',   bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
                    { value: 'HOURLY',  label: '⏱ รายชั่วโมง',  desc: 'บันทึกชม.จริง',    bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
                  ] as const).map(opt => {
                    const sel = form.pay_type === opt.value
                    return (
                      <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, pay_type: opt.value }))}
                        style={{ flex: 1, minWidth: 100, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${sel ? opt.border : '#e5e7eb'}`, background: sel ? opt.bg : '#fafafa', textAlign: 'left', transition: 'all .15s' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: sel ? opt.color : '#374151' }}>{opt.label}</div>
                        <div style={{ fontSize: '10px', color: sel ? opt.color : '#9ca3af', marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>

                {form.pay_type === 'HOURLY' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                      อัตราค่าจ้าง (บาท/ชั่วโมง) <span style={{ fontWeight: 400, color: '#9ca3af' }}>— เก็บไว้อ้างอิง ไม่คำนวณในระบบ</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min="0" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="เช่น 65" style={{ ...inputStyle, width: 120 }} />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>฿/ชม.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#fff', paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : 16 }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.full_name.trim()} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: form.full_name.trim() ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#f3f4f6', color: form.full_name.trim() ? '#fff' : '#9ca3af', fontSize: '13px', fontWeight: 600, cursor: form.full_name.trim() ? 'pointer' : 'not-allowed' }}>
                {modal === 'add' ? 'เพิ่มพนักงาน' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Department Management Modal ── */}
      {deptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => { setDeptModal(false); setEditDept(null) }}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16, width: isMobile ? '100%' : 460, maxWidth: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>จัดการแผนก</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>รหัสแผนกใช้ใน AA-<strong>BB</strong>-CCC ของรหัสพนักงาน</p>
              </div>
              <button onClick={() => { setDeptModal(false); setEditDept(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* Department list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {departments.map(d => {
                  const count = employees.filter(e => e.department === d.name).length
                  const isEditing = editDept?.id === d.id
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${isEditing ? '#f97316' : '#e5e7eb'}`, background: isEditing ? '#fff7ed' : '#fafafa' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>{d.code}</span>
                      {isEditing ? (
                        <input
                          value={deptForm.name}
                          onChange={e => setDeptForm({ name: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleSaveDept()}
                          autoFocus
                          style={{ ...inputStyle, flex: 1, padding: '5px 10px' }}
                        />
                      ) : (
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#111827' }}>{d.name}</span>
                      )}
                      <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{count} คน</span>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={handleSaveDept} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f97316', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>บันทึก</button>
                          <button onClick={() => setEditDept(null)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEditDept(d)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '11px', cursor: 'pointer' }}>แก้ไข</button>
                          <button onClick={() => setDeleteDept(d)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>ลบ</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add new dept */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  เพิ่มแผนกใหม่ <span style={{ fontWeight: 400, color: '#9ca3af' }}>(รหัสถัดไป: <span style={{ fontFamily: 'monospace', color: '#1d4ed8' }}>{nextDeptCode()}</span>)</span>
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={editDept ? '' : deptForm.name}
                    onChange={e => { setEditDept(null); setDeptForm({ name: e.target.value }) }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveDept()}
                    placeholder="ชื่อแผนกใหม่..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={handleSaveDept}
                    disabled={!deptForm.name.trim() || !!editDept}
                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: deptForm.name.trim() && !editDept ? '#f97316' : '#f3f4f6', color: deptForm.name.trim() && !editDept ? '#fff' : '#9ca3af', fontSize: '13px', fontWeight: 600, cursor: deptForm.name.trim() && !editDept ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                  >
                    + เพิ่ม
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete employee confirm */}
      {deleteTarget && (
        <ConfirmDialog title="ลบพนักงาน?" message={`"${deleteTarget.full_name}" (${deleteTarget.code}) จะถูกลบออกจากระบบ`} confirmLabel="ลบพนักงาน" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {/* Delete dept confirm */}
      {deleteDept && (
        <ConfirmDialog title={`ลบแผนก "${deleteDept.name}"?`} message={`แผนกรหัส ${deleteDept.code} จะถูกลบ หากมีพนักงานในแผนกนี้จะไม่สามารถลบได้`} confirmLabel="ลบแผนก" variant="danger" onConfirm={handleDeleteDept} onCancel={() => setDeleteDept(null)} />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
