// admin/src/pages/superadmin/onboarding/index.tsx
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MOCK_TENANTS, MOCK_LINE_CONFIGS } from '../../../lib/mock'
import type { Tenant } from '../../../types'

// ── Step definitions ──────────────────────────────────────────────────────────
interface StepDef {
  id: string
  label: string
  desc: string
  icon: string
  actionLabel?: string
  actionKey?: string
}

const STEPS: StepDef[] = [
  { id: 'tenant',        label: 'สร้าง Tenant',          desc: 'สร้างบัญชีบริษัทในระบบ TimeLine',           icon: '🏢' },
  { id: 'plan',          label: 'กำหนด Plan & Billing',   desc: 'เลือก Package และตั้งค่าการชำระเงิน',        icon: '📦', actionLabel: 'จัดการ Billing', actionKey: 'billing' },
  { id: 'line_config',   label: 'ตั้งค่า Line OA',        desc: 'กรอก Channel ID / Channel Secret / LIFF ID', icon: '🤖', actionLabel: 'ตั้งค่า Line OA', actionKey: 'line' },
  { id: 'webhook',       label: 'ยืนยัน Webhook',         desc: 'ทดสอบการเชื่อมต่อ Line Messaging API',        icon: '🔗', actionLabel: 'ทดสอบ Webhook', actionKey: 'line' },
  { id: 'branch',        label: 'เพิ่มสาขา',              desc: 'เพิ่มสาขาอย่างน้อย 1 สาขาพร้อมพิกัด GPS',    icon: '🏪', actionLabel: 'ดูรายละเอียด', actionKey: 'detail' },
  { id: 'shift',         label: 'ตั้งค่ากะงาน',           desc: 'กำหนด Shift ให้แต่ละสาขา',                  icon: '⏰', actionLabel: 'ดูรายละเอียด', actionKey: 'detail' },
  { id: 'employee',      label: 'เพิ่มพนักงาน',           desc: 'นำเข้าข้อมูลพนักงานอย่างน้อย 1 คน',         icon: '👥', actionLabel: 'ดูรายละเอียด', actionKey: 'detail' },
  { id: 'employee_line', label: 'ผูก Line พนักงาน',       desc: 'พนักงานยืนยันตัวตนผ่าน Line LIFF ครบทุกคน', icon: '📱', actionLabel: 'ส่ง Reminder', actionKey: 'reminder' },
]

// ── Per-tenant checklist computation ─────────────────────────────────────────
interface TenantChecklist {
  tenant: Tenant
  steps: Record<string, boolean>
  completed: number
  total: number
  pct: number
  employeeLinePct: number
}

const EMPLOYEE_LINE_PCT: Record<string, number> = {
  'tn-01': 100,
  'tn-02': 100,
  'tn-03': 75,
  'tn-04': 0,
  'tn-05': 0,
  'tn-06': 90,
  'tn-07': 40,
  'tn-08': 60,
}

function buildChecklist(tenant: Tenant): TenantChecklist {
  const lineConfig = MOCK_LINE_CONFIGS.find(c => c.tenant_id === tenant.id)
  const empLinePct = EMPLOYEE_LINE_PCT[tenant.id] ?? 0

  const steps: Record<string, boolean> = {
    tenant:        true,
    plan:          true,
    line_config:   tenant.line_configured,
    webhook:       !!lineConfig?.verified,
    branch:        tenant.branch_count > 0,
    shift:         tenant.branch_count > 0,
    employee:      tenant.employee_count > 0,
    employee_line: empLinePct === 100,
  }

  const completed = Object.values(steps).filter(Boolean).length
  const total = STEPS.length

  return {
    tenant,
    steps,
    completed,
    total,
    pct: Math.round((completed / total) * 100),
    employeeLinePct: empLinePct,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PLAN_COLOR: Record<string, string> = {
  STARTER: '#059669', PROFESSIONAL: '#2563eb', ENTERPRISE: '#7c3aed',
}
const PLAN_BG: Record<string, string> = {
  STARTER: '#d1fae5', PROFESSIONAL: '#dbeafe', ENTERPRISE: '#ede9fe',
}
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#059669', TRIAL: '#d97706', SUSPENDED: '#dc2626',
}
const STATUS_BG: Record<string, string> = {
  ACTIVE: '#d1fae5', TRIAL: '#fef3c7', SUSPENDED: '#fee2e2',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', TRIAL: 'Trial', SUSPENDED: 'Suspended',
}

function thDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return `${day}/${m}/${y + 543}`
}

function ProgressBar({ pct, color = '#4f46e5' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: '100%', borderRadius: 99,
        background: pct === 100 ? '#10b981' : color,
        transform: `scaleX(${pct / 100})`, transformOrigin: 'left',
        transition: 'transform 0.4s',
      }} />
    </div>
  )
}

type FilterMode = 'all' | 'todo' | 'inprogress' | 'done'

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [reminded, setReminded] = useState<Set<string>>(new Set())

  const checklists = MOCK_TENANTS.map(buildChecklist)

  const counts = {
    all: checklists.length,
    todo: checklists.filter(c => c.pct === 0).length,
    inprogress: checklists.filter(c => c.pct > 0 && c.pct < 100).length,
    done: checklists.filter(c => c.pct === 100).length,
  }

  const filtered = checklists.filter(c => {
    if (filter === 'todo')       return c.pct === 0
    if (filter === 'inprogress') return c.pct > 0 && c.pct < 100
    if (filter === 'done')       return c.pct === 100
    return true
  })

  function toggleExpand(id: string) {
    setExpanded(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function handleAction(actionKey: string, tenantId: string, stepId: string) {
    if (actionKey === 'billing')  navigate(`/superadmin/billing`)
    if (actionKey === 'line')     navigate(`/superadmin/tenants/${tenantId}`)
    if (actionKey === 'detail')   navigate(`/superadmin/tenants/${tenantId}`)
    if (actionKey === 'reminder') {
      setReminded(s => new Set(s).add(`${tenantId}-${stepId}`))
    }
  }

  const overallPct = Math.round(checklists.reduce((s, c) => s + c.pct, 0) / checklists.length)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '28px 32px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Onboarding Checklist
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              ติดตามความคืบหน้าการ Onboard Tenant ใหม่ — ตรวจสอบให้ครบทุก Step ก่อน Go-Live
            </p>
          </div>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '12px 20px', textAlign: 'center', minWidth: 140,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Progress</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: overallPct === 100 ? '#10b981' : '#4f46e5', lineHeight: 1.2, margin: '4px 0' }}>
              {overallPct}%
            </div>
            <ProgressBar pct={overallPct} />
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
              {counts.done}/{counts.all} Tenants พร้อมใช้งาน
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20 }}>
          {([
            { key: 'all',        label: 'Tenant ทั้งหมด',      color: '#4f46e5', bg: '#ede9fe', icon: '🏗' },
            { key: 'done',       label: 'เสร็จสิ้นครบถ้วน',   color: '#059669', bg: '#d1fae5', icon: '✅' },
            { key: 'inprogress', label: 'กำลังดำเนินการ',      color: '#d97706', bg: '#fef3c7', icon: '⏳' },
            { key: 'todo',       label: 'ยังไม่เริ่ม',          color: '#dc2626', bg: '#fee2e2', icon: '⚠️' },
          ] as const).map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key as FilterMode)}
              style={{
                background: filter === c.key ? c.bg : '#fff',
                border: `2px solid ${filter === c.key ? c.color : '#e2e8f0'}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: c.color, lineHeight: 1 }}>
                {counts[c.key as keyof typeof counts]}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>{c.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([
          { key: 'all',        label: `ทั้งหมด (${counts.all})` },
          { key: 'inprogress', label: `กำลังดำเนินการ (${counts.inprogress})` },
          { key: 'todo',       label: `ยังไม่เริ่ม (${counts.todo})` },
          { key: 'done',       label: `เสร็จสิ้น (${counts.done})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key as FilterMode)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 500,
              cursor: 'pointer', border: 'none',
              background: filter === t.key ? '#4f46e5' : '#fff',
              color: filter === t.key ? '#fff' : '#64748b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Tenant Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            ไม่มีข้อมูลในหมวดนี้
          </div>
        )}
        {filtered.map(c => {
          const isOpen = expanded.has(c.tenant.id)
          const incomplete = STEPS.filter(s => !c.steps[s.id])

          return (
            <div key={c.tenant.id} style={{
              background: '#fff', borderRadius: 16,
              border: c.pct === 100 ? '2px solid #d1fae5' : '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Card Header */}
              <div
                onClick={() => toggleExpand(c.tenant.id)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
              >
                {/* Completion ring */}
                <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                  <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="26" cy="26" r="22" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle
                      cx="26" cy="26" r="22" fill="none"
                      stroke={c.pct === 100 ? '#10b981' : '#4f46e5'}
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - c.pct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800,
                    color: c.pct === 100 ? '#10b981' : '#4f46e5',
                  }}>
                    {c.pct === 100 ? '✓' : `${c.pct}%`}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      {c.tenant.name}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      color: PLAN_COLOR[c.tenant.plan], background: PLAN_BG[c.tenant.plan],
                    }}>{c.tenant.plan}</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      color: STATUS_COLOR[c.tenant.status], background: STATUS_BG[c.tenant.status],
                    }}>{STATUS_LABEL[c.tenant.status]}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 3 }}>
                    {c.tenant.owner_name} · {c.tenant.owner_email} · เริ่ม {thDate(c.tenant.created_at)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <div style={{ flex: 1, maxWidth: 240 }}>
                      <ProgressBar pct={c.pct} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {c.completed}/{c.total} ขั้นตอน
                    </span>
                    {incomplete.length > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
                        ค้าง {incomplete.length} รายการ
                      </span>
                    )}
                  </div>
                </div>

                {/* Step pills preview (top 3 pending) */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {incomplete.slice(0, 3).map(s => (
                    <span key={s.id} style={{
                      fontSize: '0.7rem', padding: '3px 8px', borderRadius: 99,
                      background: '#fef3c7', color: '#d97706', fontWeight: 600,
                      border: '1px solid #fde68a',
                    }}>{s.icon} {s.label}</span>
                  ))}
                  {incomplete.length > 3 && (
                    <span style={{
                      fontSize: '0.7rem', padding: '3px 8px', borderRadius: 99,
                      background: '#f1f5f9', color: '#64748b',
                    }}>+{incomplete.length - 3}</span>
                  )}
                  {incomplete.length === 0 && (
                    <span style={{
                      fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99,
                      background: '#d1fae5', color: '#059669', fontWeight: 700,
                    }}>✅ พร้อมใช้งาน</span>
                  )}
                </div>

                {/* Chevron */}
                <ChevronDown size={16} color="#94a3b8"
                  style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* Expanded checklist */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 20px 16px' }}>
                  {/* Mini stat row */}
                  <div style={{ display: 'flex', gap: 20, padding: '10px 0 14px', borderBottom: '1px solid #f8fafc', marginBottom: 12 }}>
                    {[
                      { label: 'สาขา', value: c.tenant.branch_count },
                      { label: 'พนักงาน', value: c.tenant.employee_count },
                      { label: 'Line พนักงาน', value: `${c.employeeLinePct}%` },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.label}</div>
                      </div>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/superadmin/tenants/${c.tenant.id}`) }}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                        background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#4f46e5', fontWeight: 600,
                      }}
                    >ดูรายละเอียด Tenant →</button>
                  </div>

                  {/* Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {STEPS.map((step, idx) => {
                      const done = c.steps[step.id]
                      const isLast = idx === STEPS.length - 1
                      const remKey = `${c.tenant.id}-${step.id}`
                      const wasReminded = reminded.has(remKey)

                      // special: employee_line shows percentage bar
                      const showLinePct = step.id === 'employee_line' && !done && c.tenant.employee_count > 0

                      return (
                        <div key={step.id} style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 2 }}>
                          {/* Timeline line */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: done ? '#d1fae5' : '#fef3c7',
                              border: `2px solid ${done ? '#10b981' : '#fbbf24'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700,
                              color: done ? '#059669' : '#d97706',
                              flexShrink: 0,
                            }}>
                              {done ? '✓' : (idx + 1)}
                            </div>
                            {!isLast && (
                              <div style={{ width: 2, flex: 1, background: done ? '#d1fae5' : '#f1f5f9', margin: '2px 0' }} />
                            )}
                          </div>

                          {/* Content */}
                          <div style={{
                            flex: 1, paddingBottom: isLast ? 0 : 14,
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.875rem' }}>{step.icon}</span>
                                <span style={{
                                  fontSize: '0.875rem', fontWeight: 600,
                                  color: done ? '#059669' : '#0f172a',
                                  textDecoration: done ? 'line-through' : 'none',
                                  textDecorationColor: '#10b981',
                                }}>
                                  {step.label}
                                </span>
                                {done && (
                                  <span style={{ fontSize: '0.68rem', background: '#d1fae5', color: '#059669', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>เสร็จแล้ว</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                                {step.desc}
                              </div>
                              {showLinePct && (
                                <div style={{ marginTop: 6, maxWidth: 200 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 3 }}>
                                    <span>ยืนยันแล้ว {c.employeeLinePct}%</span>
                                    <span>{Math.round(c.tenant.employee_count * c.employeeLinePct / 100)}/{c.tenant.employee_count} คน</span>
                                  </div>
                                  <ProgressBar pct={c.employeeLinePct} color="#f59e0b" />
                                </div>
                              )}
                            </div>

                            {/* Action button */}
                            {!done && step.actionLabel && step.actionKey && (
                              <button
                                onClick={e => { e.stopPropagation(); handleAction(step.actionKey!, c.tenant.id, step.id) }}
                                style={{
                                  padding: '5px 12px', borderRadius: 7, fontSize: '0.78rem',
                                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                  border: step.actionKey === 'reminder'
                                    ? `1px solid ${wasReminded ? '#d1fae5' : '#fde68a'}`
                                    : '1px solid #c7d2fe',
                                  background: step.actionKey === 'reminder'
                                    ? (wasReminded ? '#d1fae5' : '#fef3c7')
                                    : '#eef2ff',
                                  color: step.actionKey === 'reminder'
                                    ? (wasReminded ? '#059669' : '#d97706')
                                    : '#4f46e5',
                                }}
                              >
                                {step.actionKey === 'reminder' && wasReminded ? '✓ ส่งแล้ว' : step.actionLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 28, padding: '14px 20px', background: '#fff', borderRadius: 12,
        border: '1px solid #e2e8f0', display: 'flex', gap: 24, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>คำแนะนำ:</span>
        {[
          { icon: '🟢', text: 'เสร็จสิ้น — ขั้นตอนผ่านเกณฑ์' },
          { icon: '🟡', text: 'ค้างดำเนินการ — ต้องดำเนินการต่อ' },
          { icon: '📱', text: 'Line ผูกบัญชี — พนักงานต้องยืนยันเอง' },
          { icon: '✅', text: 'พร้อมใช้งาน — ครบทุก Step แล้ว' },
        ].map(l => (
          <span key={l.text} style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>{l.icon}</span>{l.text}
          </span>
        ))}
      </div>
    </div>
  )
}
