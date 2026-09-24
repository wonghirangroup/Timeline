// Super Admin — Package / Plan Management
// เดิมกด "บันทึก" แล้วขึ้น "มีผลกับ Tenant ทันที" แต่จริงๆ เป็นแค่ Zustand
// state ในเบราว์เซอร์ ไม่เคยยิง API เลย (ดู brain log v211) — ตอนนี้ต่อกับ
// PackagePlan model จริงแล้ว: "บันทึก" แก้แค่เทมเพลต ไม่กระทบ tenant ที่ใช้
// plan นี้อยู่จนกว่าจะกด "นำไปใช้กับ tenant ที่ใช้ plan นี้" แยกต่างหาก (ปุ่ม
// ที่สอง มี confirm ก่อนเสมอ เพราะกระทบ tenant จริงที่ใช้งานอยู่)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PlanConfig, PlanFeatures, PlanLimits, TenantPlan } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/axios'

interface ApiPackagePlan {
  id: string; plan: TenantPlan; label: string; price_monthly: number | null
  color: string; bg: string
  max_employees: number; max_branches: number; max_groups: number
  enabled_features: Record<string, boolean>
}
interface ApiTenantLite { id: string; plan: TenantPlan; _count: { employees: number; branches: number } }

function toConfig(p: ApiPackagePlan): PlanConfig {
  return {
    id: p.id, plan: p.plan, label: p.label, price_monthly: p.price_monthly, color: p.color, bg: p.bg,
    limits: { max_branches: p.max_branches, max_employees: p.max_employees, max_groups: p.max_groups },
    features: p.enabled_features as unknown as PlanFeatures,
  }
}

// Feature metadata
const FEATURE_META: { key: keyof PlanFeatures; label: string; desc: string; icon: string }[] = [
  { key: 'gps_checkin',      label: 'เช็คอิน GPS',           desc: 'เช็คอินผ่าน LIFF + ตรวจสอบพิกัด GPS',     icon: '📍' },
  { key: 'leave_management', label: 'จัดการวันลา',           desc: 'ลา / อนุมัติ / ปฏิเสธใบลา',               icon: '📅' },
  { key: 'leave_balance',    label: 'โควต้าวันลา',           desc: 'กำหนดและติดตามโควต้าวันลาต่อพนักงาน',      icon: '🗓' },
  { key: 'multi_shift',      label: 'หลายกะต่อวัน',          desc: 'พนักงาน 1 คนทำได้หลายกะต่อวัน',           icon: '⏰' },
  { key: 'ot_management',    label: 'จัดการ OT',             desc: 'คำขอ / อนุมัติ / คำนวณค่า OT',             icon: '💰' },
  { key: 'fine_system',      label: 'ระบบค่าปรับ',           desc: 'ค่าปรับตามกะ / เปอร์เซ็นต์ / tier',       icon: '⚖️' },
  { key: 'announcement',     label: 'ประกาศ',                desc: 'ส่งข้อความหา Branch / แผนก / ทั้งหมด',     icon: '📢' },
  { key: 'report_export',    label: 'Export รายงาน',         desc: 'ดาวน์โหลด Excel / PDF รายงานเช็คชื่อ',     icon: '📊' },
  { key: 'feedback',         label: 'ระบบ Feedback',         desc: 'พนักงานส่ง feedback แบบไม่ระบุชื่อ',       icon: '💬' },
  { key: 'line_oa',          label: 'Line OA Integration',   desc: 'แจ้งเตือนผ่าน Line Messaging API',          icon: '💚' },
  { key: 'employee_documents', label: 'เอกสารพนักงาน',       desc: 'เก็บสัญญา/บัตร/work permit + เตือนวันหมดอายุ', icon: '📄' },
  { key: 'probation',        label: 'ทดลองงาน',              desc: 'ติดตามช่วงทดลองงาน + เตือนก่อนครบ + บันทึกผล', icon: '🎯' },
  { key: 'disciplinary',     label: 'หนังสือเตือน',          desc: 'ออกหนังสือเตือน 1/2/3 + พนักงานรับทราบ',    icon: '⚠️' },
  { key: 'resignation',      label: 'ลาออก (พนักงานยื่นเอง)', desc: 'พนักงานยื่นลาออกผ่าน LIFF → แอดมินอนุมัติ',   icon: '🚪' },
  { key: 'custom_leave_types', label: 'ประเภทการลากำหนดเอง', desc: 'ลาบวช/เกณฑ์ทหาร/ไม่รับเงิน — tenant ตั้งเอง', icon: '🗂' },
  { key: 'leave_accrual',    label: 'สะสมวันลา',            desc: 'สะสม X วัน/เดือน + ยกยอดข้ามปี', icon: '📈' },
  { key: 'document_request', label: 'ขอเอกสาร HR',          desc: 'สลิปเงินเดือน/หนังสือรับรองเงินเดือน/หนังสือรับรองการทำงานผ่าน LIFF', icon: '🧾' },
  { key: 'vacation_policy',  label: 'นโยบายพักร้อนตามอายุงาน', desc: 'โบนัสรายเดือน + reset ประจำปีตามสูตรอายุงาน', icon: '🏖️' },
]

const PLAN_ORDER: TenantPlan[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']

function LimitInput({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const isUnlimited = value === -1
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {!isUnlimited && (
        <input
          type="number"
          min={1}
          value={value}
          onChange={e => onChange(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={disabled}
          style={{
            width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db',
            fontSize: '0.85rem', textAlign: 'center', fontFamily: 'inherit',
            background: disabled ? '#f9fafb' : '#fff',
          }}
        />
      )}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '0.78rem', color: isUnlimited ? '#7c3aed' : 'var(--text-gray)',
        fontWeight: isUnlimited ? 700 : 400, whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        <input
          type="checkbox"
          checked={isUnlimited}
          onChange={() => onChange(isUnlimited ? 999 : -1)}
          disabled={disabled}
          style={{ accentColor: '#7c3aed', width: 14, height: 14, cursor: disabled ? 'default' : 'pointer' }}
        />
        ∞ ไม่จำกัด
      </label>
    </div>
  )
}

function ToggleSwitch({
  checked, onChange, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--sa-accent)' : '#d1d5db', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

export default function PackagesPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()

  const { data: apiPackages = [], isLoading } = useQuery<ApiPackagePlan[]>({
    queryKey: ['sa', 'packages'],
    queryFn: () => api.get('/api/v1/super-admin/packages').then(r => r.data.data),
  })
  const { data: tenants = [] } = useQuery<ApiTenantLite[]>({
    queryKey: ['sa', 'tenants', 'lite'],
    queryFn: () => api.get('/api/v1/super-admin/tenants').then(r => r.data.data),
  })

  // Local draft — เก็บแยกจาก server data จนกว่าจะกด "บันทึก" สำเร็จ
  const [drafts, setDrafts] = useState<Record<string, PlanConfig>>({})
  const configs: PlanConfig[] = PLAN_ORDER
    .map(plan => drafts[plan] ?? (apiPackages.find(p => p.plan === plan) ? toConfig(apiPackages.find(p => p.plan === plan)!) : null))
    .filter((c): c is PlanConfig => !!c)

  const [saving, setSaving] = useState<TenantPlan | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [applyTarget, setApplyTarget] = useState<PlanConfig | null>(null)

  function setDraft(plan: TenantPlan, patch: Partial<PlanConfig>) {
    setDrafts(prev => {
      const base = prev[plan] ?? toConfig(apiPackages.find(p => p.plan === plan)!)
      return { ...prev, [plan]: { ...base, ...patch } }
    })
  }
  function updateLimit(plan: TenantPlan, key: keyof PlanLimits, val: number) {
    const cur = configs.find(c => c.plan === plan)!
    setDraft(plan, { limits: { ...cur.limits, [key]: val } })
  }
  function updateFeature(plan: TenantPlan, key: keyof PlanFeatures, val: boolean) {
    const cur = configs.find(c => c.plan === plan)!
    setDraft(plan, { features: { ...cur.features, [key]: val } })
  }
  function updatePrice(plan: TenantPlan, val: number) {
    setDraft(plan, { price_monthly: val })
  }

  const saveMutation = useMutation({
    mutationFn: (cfg: PlanConfig) => api.patch(`/api/v1/super-admin/packages/${cfg.plan}`, {
      label: cfg.label, price_monthly: cfg.price_monthly, color: cfg.color, bg: cfg.bg,
      max_employees: cfg.limits.max_employees, max_branches: cfg.limits.max_branches, max_groups: cfg.limits.max_groups,
      enabled_features: cfg.features,
    }),
    onSuccess: (_, cfg) => {
      qc.invalidateQueries({ queryKey: ['sa', 'packages'] })
      setDrafts(prev => { const next = { ...prev }; delete next[cfg.plan]; return next })
      showToast('success', `บันทึกเทมเพลตแพ็กเกจ ${cfg.label} แล้ว — กด "นำไปใช้กับ tenant" ถ้าต้องการให้มีผลกับ tenant ที่ใช้ plan นี้`)
    },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ — กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่'),
    onSettled: () => setSaving(null),
  })

  const applyMutation = useMutation({
    mutationFn: (plan: TenantPlan) => api.post(`/api/v1/super-admin/packages/${plan}/apply-to-tenants`).then(r => r.data.data as { count: number }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sa', 'tenants'] })
      showToast('success', `นำไปใช้กับ ${result.count} tenant สำเร็จ`)
      setApplyTarget(null)
    },
    onError: () => showToast('error', 'นำไปใช้ไม่สำเร็จ'),
  })

  function handleSave(plan: TenantPlan) {
    const draft = configs.find(c => c.plan === plan)
    if (!draft) return
    setSaving(plan)
    saveMutation.mutate(draft)
  }

  const tenantsByPlan = (plan: TenantPlan) => tenants.filter(t => t.plan === plan)

  if (isLoading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-gray)' }}>กำลังโหลด...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>📦 จัดการ Package & Plan</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-gray)' }}>กำหนด limits และ feature เป็นเทมเพลตต่อ plan — "บันทึก" แก้แค่เทมเพลต ต้องกด "นำไปใช้กับ tenant" แยกถึงจะมีผลกับ tenant ที่ใช้ plan นั้นจริง</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            onClick={() => setCompareMode(m => !m)}
            title="เปรียบเทียบ limit ของทุก plan แบบ side-by-side — feature descriptions จะถูกซ่อนเพื่อให้เห็นตัวเลขได้ชัดขึ้น"
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: compareMode ? 'var(--sa-accent)' : '#fff', color: compareMode ? '#fff' : 'var(--text-body)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {compareMode ? '✕ ปิดโหมดเปรียบเทียบ' : '⇄ เปรียบเทียบ Plans'}
          </button>
          {!compareMode && (
            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>ดู limit ทุก plan แบบ side-by-side</span>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid-3-col" style={{ gap: 18 }}>
        {PLAN_ORDER.map(plan => {
          const cfg = configs.find(c => c.plan === plan)
          if (!cfg) return null
          const tenantCount = tenantsByPlan(plan).length
          const isEnterprise = plan === 'ENTERPRISE'
          const isDirty = !!drafts[plan]

          return (
            <div key={plan} style={{
              background: '#fff', borderRadius: 14,
              border: `2px solid ${cfg.color}22`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Card header */}
              <div style={{ background: cfg.bg, padding: '18px 20px', borderBottom: `1px solid ${cfg.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{cfg.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color, lineHeight: 1.2, marginTop: 2 }}>
                      {cfg.price_monthly == null ? 'ติดต่อเรา' : `฿${cfg.price_monthly.toLocaleString()}`}
                      {cfg.price_monthly != null && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}>/เดือน</span>}
                    </div>
                  </div>
                  <span style={{ background: '#fff', color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {tenantCount} Tenant
                  </span>
                </div>

                {/* Price input */}
                {!isEnterprise && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>ราคา ฿/เดือน</span>
                    <input
                      type="number"
                      value={cfg.price_monthly ?? 0}
                      onChange={e => updatePrice(plan, Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ width: 90, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'inherit' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ── Limits section ── */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-body)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                    📏 จำนวนที่อนุญาต
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      { key: 'max_branches' as const,  label: 'จำนวนสาขา' },
                      { key: 'max_employees' as const, label: 'จำนวนพนักงาน' },
                      { key: 'max_groups' as const,     label: 'จำนวนกลุ่ม (บริษัท)' },
                    ]).map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-body)', minWidth: 0 }}>{label}</span>
                        <LimitInput
                          value={cfg.limits[key]}
                          onChange={v => updateLimit(plan, key, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Features section ── */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-body)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                    🔧 ฟีเจอร์
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {FEATURE_META.map(({ key, label, desc, icon }, i) => {
                      const enabled = cfg.features[key] ?? true
                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom: i < FEATURE_META.length - 1 ? '1px solid #f3f4f6' : 'none',
                            opacity: enabled ? 1 : 0.45,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark)' }}>{label}</div>
                              {!compareMode && (
                                <div style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.3, marginTop: 1 }}>{desc}</div>
                              )}
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={enabled}
                            onChange={v => updateFeature(plan, key, v)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Save + Apply buttons */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => handleSave(plan)}
                  disabled={saving === plan || !isDirty}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                    cursor: (saving === plan || !isDirty) ? 'not-allowed' : 'pointer',
                    background: saving === plan ? '#e0e7ff' : !isDirty ? '#e5e7eb' : cfg.color === 'var(--text-body)' ? 'var(--text-body)' : cfg.color,
                    color: !isDirty && saving !== plan ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: '0.875rem',
                    transition: 'opacity 0.2s', opacity: saving === plan ? 0.7 : 1,
                  }}
                >
                  {saving === plan ? 'กำลังบันทึก…' : isDirty ? `💾 บันทึกเทมเพลต ${cfg.label}` : 'ไม่มีการแก้ไข'}
                </button>
                <button
                  onClick={() => setApplyTarget(cfg)}
                  disabled={tenantCount === 0}
                  title={tenantCount === 0 ? 'ไม่มี tenant ที่ใช้ plan นี้อยู่' : `นำเทมเพลตนี้ไปทับ limit/feature ของ ${tenantCount} tenant ที่ใช้ plan นี้`}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${cfg.color}55`,
                    cursor: tenantCount === 0 ? 'not-allowed' : 'pointer',
                    background: '#fff', color: tenantCount === 0 ? '#d1d5db' : cfg.color, fontWeight: 600, fontSize: '0.78rem',
                  }}
                >
                  ⚡ นำไปใช้กับ {tenantCount} tenant ที่ใช้ plan นี้
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Active tenants per plan warning ── */}
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 10 }}>⚠️ ผลกระทบต่อ Tenant ที่ใช้งานอยู่ (เทียบกับเทมเพลตปัจจุบันที่แก้ในหน้านี้)</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PLAN_ORDER.map(plan => {
            const cfg = configs.find(c => c.plan === plan)
            if (!cfg) return null
            const planTenants = tenantsByPlan(plan)
            const overBranch = planTenants.filter(t => cfg.limits.max_branches !== -1 && t._count.branches > cfg.limits.max_branches)
            const overEmp    = planTenants.filter(t => cfg.limits.max_employees !== -1 && t._count.employees > cfg.limits.max_employees)
            const hasWarning = overBranch.length > 0 || overEmp.length > 0
            return (
              <div key={plan} style={{
                flex: '1 1 220px', padding: '12px 14px', borderRadius: 10,
                background: hasWarning ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${hasWarning ? '#fca5a5' : '#86efac'}`,
              }}>
                <div style={{ fontWeight: 700, color: cfg.color, fontSize: '0.85rem', marginBottom: 6 }}>{cfg.label}</div>
                {planTenants.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>ยังไม่มี tenant ใช้ plan นี้</div>
                ) : hasWarning ? (
                  <>
                    {overBranch.length > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--error-text)' }}>⚠ {overBranch.length} tenant มีสาขาเกินลิมิต</div>}
                    {overEmp.length > 0    && <div style={{ fontSize: '0.78rem', color: 'var(--error-text)' }}>⚠ {overEmp.length} tenant มีพนักงานเกินลิมิต</div>}
                  </>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--success-text)' }}>✓ Tenant ทั้งหมดอยู่ในลิมิต</div>
                )}
              </div>
            )
          })}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
          * การลดลิมิตไม่ได้ลบข้อมูลที่มีอยู่ แต่จะป้องกันการเพิ่มข้อมูลใหม่เกินจำนวนที่กำหนด — แถบนี้เทียบกับเทมเพลตที่เห็นอยู่บนจอ (รวมส่วนที่ยังไม่บันทึกด้วย) ไม่ใช่ค่าที่ tenant ใช้งานจริงตอนนี้
        </p>
      </div>

      {/* ── Confirm: นำไปใช้กับ tenant ── */}
      {applyTarget && (
        <div onClick={() => setApplyTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 420, maxWidth: '100%', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700 }}>⚡ นำเทมเพลต "{applyTarget.label}" ไปใช้กับ tenant?</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-gray)', lineHeight: 1.6 }}>
              การกระทำนี้จะทับ <strong>limit (สาขา/พนักงาน/กลุ่ม) และฟีเจอร์ที่เปิด</strong> ของ
              <strong> {tenantsByPlan(applyTarget.plan).length} tenant</strong> ที่ใช้ plan "{applyTarget.label}" อยู่ตอนนี้ ด้วยค่าที่ตั้งไว้ในเทมเพลตนี้ทันที — ย้อนกลับไม่ได้อัตโนมัติ
            </p>
            {!drafts[applyTarget.plan] && apiPackages.length > 0 && (
              <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', borderRadius: 8, padding: '8px 12px' }}>
                หมายเหตุ: จะใช้เทมเพลตที่บันทึกล่าสุด — ถ้าเพิ่งแก้แล้วยังไม่กด "บันทึกเทมเพลต" การเปลี่ยนแปลงล่าสุดจะยังไม่ถูกนำไปใช้
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setApplyTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>ยกเลิก</button>
              <button
                onClick={() => applyMutation.mutate(applyTarget.plan)}
                disabled={applyMutation.isPending}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--error-text)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: applyMutation.isPending ? 0.7 : 1 }}
              >
                {applyMutation.isPending ? 'กำลังดำเนินการ…' : `ยืนยันนำไปใช้กับ ${tenantsByPlan(applyTarget.plan).length} tenant`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
