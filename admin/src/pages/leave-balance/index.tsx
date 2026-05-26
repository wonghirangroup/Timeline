// admin/src/pages/leave-balance/index.tsx
import { useState, useRef, useEffect } from 'react'
import { MOCK_LEAVE_BALANCES, MOCK_BRANCHES, MOCK_EMPLOYEES } from '../../lib/mock'
import type { LeaveBalance } from '../../types'

// ── Seniority Rule ────────────────────────────────────────────────────────────
interface SeniorityRule {
  id: string
  min_years: number
  max_years: number | null
  vacation_days: number
}

// ── Types ─────────────────────────────────────────────────────────────────────
type LeaveKey = 'sick' | 'personal' | 'vacation' | 'compensate'

interface Quotas { sick: number; personal: number; vacation: number; compensate: number }

// ── Config ────────────────────────────────────────────────────────────────────
const LEAVE_TYPES: { key: LeaveKey; label: string; short: string; icon: string; color: string; bg: string; border: string }[] = [
  { key: 'sick',        label: 'ลาป่วย',      short: 'ป่วย',    icon: '🤒', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  { key: 'personal',    label: 'ลากิจ',       short: 'กิจ',     icon: '📋', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  { key: 'vacation',    label: 'ลาพักร้อน',   short: 'พักร้อน', icon: '🌴', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  { key: 'compensate',  label: 'ลาชดเชย',     short: 'ชดเชย',   icon: '🔄', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
]

const DEFAULT_QUOTAS: Quotas = { sick: 30, personal: 3, vacation: 6, compensate: 0 }

// ── Helpers ───────────────────────────────────────────────────────────────────
function usedOf(b: LeaveBalance, key: LeaveKey) { return b[`${key}_used`] }
function quotaOf(b: LeaveBalance, key: LeaveKey) { return b[`${key}_quota`] }

function statusColor(used: number, quota: number): string {
  if (quota === 0) return '#94a3b8'
  const pct = used / quota
  if (pct >= 1) return '#dc2626'
  if (pct >= 0.8) return '#d97706'
  return '#059669'
}

function MiniBar({ used, quota, color }: { used: number; quota: number; color: string }) {
  const pct = quota === 0 ? 0 : Math.min(100, Math.round((used / quota) * 100))
  const barColor = quota === 0 ? '#e2e8f0' : used > quota ? '#dc2626' : used / quota >= 0.8 ? '#f59e0b' : '#10b981'
  return (
    <div style={{ height: 4, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
interface EditModalProps {
  balance: LeaveBalance
  onSave: (id: string, quotas: Quotas) => void
  onClose: () => void
}

function EditModal({ balance, onSave, onClose }: EditModalProps) {
  const [quotas, setQuotas] = useState<Quotas>({
    sick:       balance.sick_quota,
    personal:   balance.personal_quota,
    vacation:   balance.vacation_quota,
    compensate: balance.compensate_quota,
  })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (overlayRef.current === e.target) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }}>
      <div style={{ background: '#fff', borderRadius: 18, width: 460, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🗓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>แก้ไขโควต้าวันลา</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 1 }}>
              {balance.full_name} ({balance.nickname}) — {balance.branch_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Quota inputs */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {LEAVE_TYPES.map(lt => {
            const used = usedOf(balance, lt.key)
            const q = quotas[lt.key]
            const overUsed = used > q
            return (
              <div key={lt.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, background: lt.bg, border: `1.5px solid ${lt.border}` }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{lt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: lt.color }}>{lt.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    ใช้ไปแล้ว {used} วัน
                    {overUsed && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 6 }}>⚠ เกินโควต้า!</span>}
                  </div>
                  <MiniBar used={used} quota={q} color={lt.color} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setQuotas(p => ({ ...p, [lt.key]: Math.max(0, p[lt.key] - 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#374151', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <input
                    type="number"
                    min={0}
                    value={q}
                    onChange={e => setQuotas(p => ({ ...p, [lt.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ width: 52, padding: '5px 6px', borderRadius: 8, border: `1.5px solid ${overUsed ? '#fca5a5' : '#e2e8f0'}`, fontSize: '0.95rem', fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none', color: overUsed ? '#dc2626' : '#0f172a' }}
                  />
                  <button
                    onClick={() => setQuotas(p => ({ ...p, [lt.key]: p[lt.key] + 1 }))}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#374151', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: 24 }}>วัน</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
          <button
            onClick={() => onSave(balance.employee_id, quotas)}
            style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
          >บันทึกโควต้า</button>
        </div>
      </div>
    </div>
  )
}

// ── Default Quota Panel ───────────────────────────────────────────────────────
interface DefaultPanelProps {
  defaults: Quotas
  onChange: (q: Quotas) => void
  onApplyAll: () => void
  onApplyNew: () => void
  totalCount: number
}

function DefaultPanel({ defaults, onChange, onApplyAll, onApplyNew, totalCount }: DefaultPanelProps) {
  const [applyConfirm, setApplyConfirm] = useState<'all' | 'new' | null>(null)

  return (
    <div style={{ background: '#fff', border: '2px solid #c7d2fe', borderRadius: 14, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(79,70,229,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚙️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>โควต้าเริ่มต้น (Default)</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>กำหนดโควต้าพื้นฐานแล้วนำไปใช้กับพนักงานทั้งหมดหรือเฉพาะรายใหม่</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        {LEAVE_TYPES.map(lt => (
          <div key={lt.key} style={{ background: lt.bg, border: `1px solid ${lt.border}`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: lt.color, marginBottom: 8 }}>{lt.icon} {lt.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => onChange({ ...defaults, [lt.key]: Math.max(0, defaults[lt.key] - 1) })}
                style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >−</button>
              <input
                type="number"
                min={0}
                value={defaults[lt.key]}
                onChange={e => onChange({ ...defaults, [lt.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                style={{ flex: 1, padding: '4px 4px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.95rem', fontWeight: 800, textAlign: 'center', fontFamily: 'inherit', background: 'rgba(255,255,255,0.7)', color: lt.color, outline: 'none', minWidth: 0 }}
              />
              <button
                onClick={() => onChange({ ...defaults, [lt.key]: defaults[lt.key] + 1 })}
                style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >+</button>
            </div>
            <div style={{ fontSize: '0.68rem', color: lt.color, opacity: 0.7, textAlign: 'center', marginTop: 4 }}>วัน / ปี</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {applyConfirm === null ? (
          <>
            <button
              onClick={() => setApplyConfirm('new')}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #c7d2fe', background: '#eef2ff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#4f46e5' }}
            >📋 ใช้กับพนักงานใหม่ที่ยังไม่มีโควต้า</button>
            <button
              onClick={() => setApplyConfirm('all')}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
            >🔄 ใช้กับพนักงานทั้งหมด ({totalCount} คน)</button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a', flex: 1 }}>
            <span style={{ fontSize: '0.82rem', color: '#92400e', flex: 1 }}>
              {applyConfirm === 'all'
                ? `⚠️ จะเขียนทับโควต้าของพนักงานทุกคน (${totalCount} คน) — ยืนยัน?`
                : '⚠️ จะตั้งโควต้าให้พนักงานที่ยังไม่มี — ยืนยัน?'}
            </span>
            <button
              onClick={() => setApplyConfirm(null)}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #fde68a', background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#92400e' }}
            >ยกเลิก</button>
            <button
              onClick={() => { applyConfirm === 'all' ? onApplyAll() : onApplyNew(); setApplyConfirm(null) }}
              style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#d97706', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >ยืนยัน</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeaveBalancePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>(MOCK_LEAVE_BALANCES)
  const [defaults, setDefaults] = useState<Quotas>(DEFAULT_QUOTAS)
  const [editTarget, setEditTarget] = useState<LeaveBalance | null>(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [showDefault, setShowDefault] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkQuotas, setBulkQuotas] = useState<Quotas>(DEFAULT_QUOTAS)

  // Seniority rules
  const [seniorityRules, setSeniorityRules] = useState<SeniorityRule[]>([
    { id: 's1', min_years: 0,  max_years: 1,    vacation_days: 6  },
    { id: 's2', min_years: 1,  max_years: 3,    vacation_days: 8  },
    { id: 's3', min_years: 3,  max_years: 5,    vacation_days: 10 },
    { id: 's4', min_years: 5,  max_years: null, vacation_days: 15 },
  ])
  const [showSeniority, setShowSeniority] = useState(false)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  // Filters
  const branches = ['ALL', ...Array.from(new Set(balances.map(b => b.branch_name)))]

  const filtered = balances.filter(b => {
    if (branchFilter !== 'ALL' && b.branch_name !== branchFilter) return false
    if (search && !b.full_name.toLowerCase().includes(search.toLowerCase()) &&
                  !b.nickname.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Stats
  const totalEmployees = balances.length
  const warnings = balances.filter(b =>
    LEAVE_TYPES.some(lt => usedOf(b, lt.key) > quotaOf(b, lt.key))
  ).length
  const nearLimit = balances.filter(b =>
    LEAVE_TYPES.some(lt => {
      const q = quotaOf(b, lt.key)
      if (q === 0) return false
      return usedOf(b, lt.key) / q >= 0.8 && usedOf(b, lt.key) <= q
    })
  ).length

  // Save single employee quota
  function handleSave(employeeId: string, quotas: Quotas) {
    setBalances(bs => bs.map(b =>
      b.employee_id === employeeId ? {
        ...b,
        sick_quota: quotas.sick,
        personal_quota: quotas.personal,
        vacation_quota: quotas.vacation,
        compensate_quota: quotas.compensate,
      } : b
    ))
    setEditTarget(null)
    showToast('บันทึกโควต้าเรียบร้อยแล้ว')
  }

  // Apply default to all
  function handleApplyAll() {
    setBalances(bs => bs.map(b => ({
      ...b,
      sick_quota: defaults.sick,
      personal_quota: defaults.personal,
      vacation_quota: defaults.vacation,
      compensate_quota: defaults.compensate,
    })))
    showToast(`ตั้งโควต้า Default ให้พนักงานทั้งหมด ${totalEmployees} คนแล้ว`)
  }

  // Apply default to employees with zero quotas
  function handleApplyNew() {
    let count = 0
    setBalances(bs => bs.map(b => {
      const isNew = b.sick_quota === 0 && b.personal_quota === 0 && b.vacation_quota === 0
      if (isNew) { count++; return { ...b, sick_quota: defaults.sick, personal_quota: defaults.personal, vacation_quota: defaults.vacation, compensate_quota: defaults.compensate } }
      return b
    }))
    setTimeout(() => showToast(`ตั้งโควต้าให้พนักงานใหม่ ${count} คนแล้ว`), 100)
  }

  // Apply seniority rules
  function handleApplySeniority() {
    const today = new Date()
    let count = 0
    setBalances(bs => bs.map(b => {
      const emp = MOCK_EMPLOYEES.find(e => e.id === b.employee_id)
      if (!emp) return b
      const hireDate = new Date(emp.hire_date)
      const yearsOfService = (today.getTime() - hireDate.getTime()) / (365.25 * 24 * 3600 * 1000)
      const rule = seniorityRules
        .slice()
        .sort((a, r) => b.employee_id ? 0 : 0) // keep order
        .find(r => yearsOfService >= r.min_years && (r.max_years === null || yearsOfService < r.max_years))
      if (!rule) return b
      count++
      return { ...b, vacation_quota: rule.vacation_days }
    }))
    setTimeout(() => showToast(`อัปเดตวันพักร้อนตามอายุงานให้พนักงาน ${MOCK_EMPLOYEES.length} คนแล้ว`), 100)
  }

  // Bulk edit selected
  function handleBulkSave() {
    setBalances(bs => bs.map(b =>
      selectedIds.has(b.employee_id) ? {
        ...b,
        sick_quota: bulkQuotas.sick,
        personal_quota: bulkQuotas.personal,
        vacation_quota: bulkQuotas.vacation,
        compensate_quota: bulkQuotas.compensate,
      } : b
    ))
    showToast(`แก้ไขโควต้าพนักงาน ${selectedIds.size} คนเรียบร้อยแล้ว`)
    setSelectedIds(new Set())
    setBulkEditOpen(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(b => b.employee_id)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem',
          background: toast.ok !== false ? '#d1fae5' : '#fee2e2',
          color: toast.ok !== false ? '#059669' : '#dc2626',
          border: `1px solid ${toast.ok !== false ? '#a7f3d0' : '#fecaca'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {toast.ok !== false ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>โควต้าวันลาพนักงาน</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              กำหนดจำนวนวันลาสูงสุดต่อปีของพนักงานแต่ละคน — พนักงานลาเกินโควต้าไม่ได้
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowSeniority(s => !s)}
              style={{
                padding: '9px 16px', borderRadius: 9,
                border: `1.5px solid ${showSeniority ? '#fcd34d' : '#e2e8f0'}`,
                background: showSeniority ? '#fef3c7' : '#fff',
                fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer',
                color: showSeniority ? '#d97706' : '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >⏳ เงื่อนไขอายุงาน {showSeniority ? '▲' : '▼'}</button>
            <button
              onClick={() => setShowDefault(s => !s)}
              style={{
                padding: '9px 16px', borderRadius: 9,
                border: `1.5px solid ${showDefault ? '#c7d2fe' : '#e2e8f0'}`,
                background: showDefault ? '#eef2ff' : '#fff',
                fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer',
                color: showDefault ? '#4f46e5' : '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >⚙️ โควต้า Default {showDefault ? '▲' : '▼'}</button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
          {[
            { label: 'พนักงานทั้งหมด', value: totalEmployees,  icon: '👥', color: '#4f46e5', bg: '#eef2ff' },
            { label: 'เกินโควต้า',      value: warnings,        icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
            { label: 'ใกล้หมดโควต้า',  value: nearLimit,        icon: '⚠️', color: '#d97706', bg: '#fef3c7' },
            { label: 'ปกติ',           value: totalEmployees - warnings - nearLimit, icon: '✅', color: '#059669', bg: '#d1fae5' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seniority rules panel */}
      {showSeniority && (
        <div style={{ background: '#fff', border: '2px solid #fcd34d', borderRadius: 14, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(217,119,6,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>เงื่อนไขวันพักร้อนตามอายุงาน</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>กำหนดจำนวนวันพักร้อนตามระยะเวลาทำงาน</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#fef3c7' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#92400e' }}>อายุงาน</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#92400e' }}>วันพักร้อน</th>
                <th style={{ padding: '8px 12px', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {seniorityRules.map((rule, idx) => (
                <tr key={rule.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number" min={0} value={rule.min_years}
                        onChange={e => setSeniorityRules(rs => rs.map(r => r.id === rule.id ? { ...r, min_years: parseInt(e.target.value) || 0 } : r))}
                        style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.85rem', fontFamily: 'inherit', textAlign: 'center' }}
                      />
                      <span style={{ color: '#6b7280' }}>–</span>
                      <input
                        type="number" min={0} value={rule.max_years ?? ''}
                        placeholder="∞"
                        onChange={e => setSeniorityRules(rs => rs.map(r => r.id === rule.id ? { ...r, max_years: e.target.value === '' ? null : parseInt(e.target.value) || null } : r))}
                        style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.85rem', fontFamily: 'inherit', textAlign: 'center' }}
                      />
                      <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>ปี</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number" min={0} value={rule.vacation_days}
                        onChange={e => setSeniorityRules(rs => rs.map(r => r.id === rule.id ? { ...r, vacation_days: parseInt(e.target.value) || 0 } : r))}
                        style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.85rem', fontFamily: 'inherit', textAlign: 'center' }}
                      />
                      <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>วัน</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      onClick={() => setSeniorityRules(rs => rs.filter(r => r.id !== rule.id))}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setSeniorityRules(rs => [...rs, { id: `s${Date.now()}`, min_years: 0, max_years: null, vacation_days: 6 }])}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #fcd34d', background: '#fef3c7', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#d97706' }}
            >+ เพิ่มเงื่อนไข</button>
            <button
              onClick={handleApplySeniority}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#d97706', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
            >🔄 คำนวณและนำไปใช้</button>
          </div>
        </div>
      )}

      {/* Default quota panel */}
      {showDefault && (
        <DefaultPanel
          defaults={defaults}
          onChange={setDefaults}
          onApplyAll={handleApplyAll}
          onApplyNew={handleApplyNew}
          totalCount={totalEmployees}
        />
      )}

      {/* Filters + bulk actions */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือชื่อเล่น..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Branch filter */}
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.84rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
        >
          {branches.map(b => <option key={b} value={b}>{b === 'ALL' ? 'ทุกสาขา' : b}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 700 }}>เลือก {selectedIds.size} คน</span>
            <button
              onClick={() => { setBulkQuotas(defaults); setBulkEditOpen(true) }}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >✏️ แก้ไขพร้อมกัน</button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', color: '#64748b' }}
            >ยกเลิก</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Table head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 1.8fr 1fr repeat(4,1fr) 60px',
          gap: 0,
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{ padding: '10px 8px 10px 14px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleAll}
              style={{ accentColor: '#4f46e5', width: 15, height: 15, cursor: 'pointer' }}
            />
          </div>
          <div style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>พนักงาน</div>
          <div style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>สาขา</div>
          {LEAVE_TYPES.map(lt => (
            <div key={lt.key} style={{ padding: '10px 8px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{lt.icon}</span>{lt.short}
            </div>
          ))}
          <div />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontSize: '0.9rem' }}>ไม่พบพนักงานที่ตรงกับเงื่อนไข</div>
        ) : filtered.map((b, idx) => {
          const isSelected = selectedIds.has(b.employee_id)
          const hasOverQuota = LEAVE_TYPES.some(lt => usedOf(b, lt.key) > quotaOf(b, lt.key))
          const hasNearLimit = !hasOverQuota && LEAVE_TYPES.some(lt => {
            const q = quotaOf(b, lt.key)
            return q > 0 && usedOf(b, lt.key) / q >= 0.8
          })

          return (
            <div
              key={b.employee_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1.8fr 1fr repeat(4,1fr) 60px',
                gap: 0,
                borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                background: isSelected ? '#fafbff' : hasOverQuota ? '#fff5f5' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected && !hasOverQuota) e.currentTarget.style.background = '#fafbff' }}
              onMouseLeave={e => { if (!isSelected && !hasOverQuota) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Checkbox */}
              <div style={{ padding: '14px 8px 14px 14px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(b.employee_id)}
                  style={{ accentColor: '#4f46e5', width: 15, height: 15, cursor: 'pointer' }}
                />
              </div>

              {/* Name */}
              <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: hasOverQuota ? '#fee2e2' : '#eef2ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800,
                    color: hasOverQuota ? '#dc2626' : '#4f46e5',
                  }}>
                    {b.nickname.slice(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.full_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.nickname}</div>
                  </div>
                </div>
                {hasOverQuota && (
                  <div style={{ marginTop: 4, fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                    🚨 เกินโควต้า
                  </div>
                )}
                {hasNearLimit && (
                  <div style={{ marginTop: 4, fontSize: '0.68rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                    ⚠️ ใกล้หมด
                  </div>
                )}
              </div>

              {/* Branch */}
              <div style={{ padding: '12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>{b.branch_name}</span>
              </div>

              {/* Leave type columns */}
              {LEAVE_TYPES.map(lt => {
                const used = usedOf(b, lt.key)
                const quota = quotaOf(b, lt.key)
                const sc = statusColor(used, quota)
                const isOver = used > quota

                return (
                  <div key={lt.key} style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: sc }}>{used}</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>/{quota === 0 ? '—' : quota}</span>
                      {isOver && <span style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 800 }}>!</span>}
                    </div>
                    <MiniBar used={used} quota={quota} color={lt.color} />
                    {quota === 0 && (
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>ยังไม่กำหนด</div>
                    )}
                  </div>
                )
              })}

              {/* Edit */}
              <div style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={() => setEditTarget(b)}
                  style={{
                    padding: '5px 10px', borderRadius: 7, border: '1px solid #e2e8f0',
                    background: '#fff', fontSize: '0.78rem', cursor: 'pointer', color: '#4f46e5', fontWeight: 600,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                >✏️</button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
        แสดง {filtered.length} จาก {balances.length} คน
      </div>

      {/* Edit single employee modal */}
      {editTarget && (
        <EditModal
          balance={editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Bulk edit modal */}
      {bulkEditOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: 460, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>✏️ แก้ไขโควต้าพร้อมกัน</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>จะนำไปใช้กับพนักงานที่เลือก {selectedIds.size} คน</div>
              </div>
              <button onClick={() => setBulkEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {LEAVE_TYPES.map(lt => (
                <div key={lt.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: lt.bg, border: `1.5px solid ${lt.border}` }}>
                  <span style={{ fontSize: '1.2rem' }}>{lt.icon}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: lt.color, flex: 1 }}>{lt.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setBulkQuotas(p => ({ ...p, [lt.key]: Math.max(0, p[lt.key] - 1) }))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input type="number" min={0} value={bulkQuotas[lt.key]} onChange={e => setBulkQuotas(p => ({ ...p, [lt.key]: Math.max(0, parseInt(e.target.value) || 0) }))} style={{ width: 52, padding: '5px 6px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={() => setBulkQuotas(p => ({ ...p, [lt.key]: p[lt.key] + 1 }))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: 24 }}>วัน</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setBulkEditOpen(false)} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
              <button onClick={handleBulkSave} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>บันทึก {selectedIds.size} คน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
