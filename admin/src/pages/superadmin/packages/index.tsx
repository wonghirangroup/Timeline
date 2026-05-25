// Super Admin — Package / Plan Management
import { useState } from 'react'
import { MOCK_TENANTS } from '../../../lib/mock'
import type { PlanConfig, PlanFeatures, PlanLimits, TenantPlan } from '../../../types'
import { useToast } from '../../../components/ui/Toast'
import { usePlanConfigStore } from '../../../stores/planConfigStore'

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
]

const PLAN_ORDER: TenantPlan[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']

function LimitInput({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const isUnlimited = value === -1
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={() => onChange(isUnlimited ? 999 : -1)}
        style={{
          padding: '3px 8px', borderRadius: 6, border: `1px solid ${isUnlimited ? '#7c3aed' : '#d1d5db'}`,
          background: isUnlimited ? '#ede9fe' : '#fff', cursor: disabled ? 'default' : 'pointer',
          fontSize: '0.7rem', fontWeight: 700, color: isUnlimited ? '#7c3aed' : '#9ca3af',
          whiteSpace: 'nowrap',
        }}
        disabled={disabled}
      >
        {isUnlimited ? '∞ ไม่จำกัด' : 'จำกัด'}
      </button>
      {!isUnlimited && (
        <input
          type="number"
          min={1}
          value={value}
          onChange={e => onChange(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={disabled}
          style={{
            width: 64, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db',
            fontSize: '0.85rem', textAlign: 'center', fontFamily: 'inherit',
            background: disabled ? '#f9fafb' : '#fff',
          }}
        />
      )}
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
        background: checked ? '#4f46e5' : '#d1d5db', position: 'relative',
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
  const storeConfigs    = usePlanConfigStore(s => s.configs)
  const storeUpdateFeat = usePlanConfigStore(s => s.updateFeature)
  const storeUpdateLim  = usePlanConfigStore(s => s.updateLimit)
  const storeUpdatePrc  = usePlanConfigStore(s => s.updatePrice)

  // Local draft — flushed to store only on save
  const [configs, setConfigs] = useState<PlanConfig[]>(storeConfigs)
  const [saving, setSaving] = useState<TenantPlan | null>(null)
  const [compareMode, setCompareMode] = useState(false)

  function updateLimit(plan: TenantPlan, key: keyof PlanLimits, val: number) {
    setConfigs(prev => prev.map(c =>
      c.plan === plan ? { ...c, limits: { ...c.limits, [key]: val } } : c
    ))
  }

  function updateFeature(plan: TenantPlan, key: keyof PlanFeatures, val: boolean) {
    setConfigs(prev => prev.map(c =>
      c.plan === plan ? { ...c, features: { ...c.features, [key]: val } } : c
    ))
  }

  function updatePrice(plan: TenantPlan, val: number) {
    setConfigs(prev => prev.map(c =>
      c.plan === plan ? { ...c, price_monthly: val } : c
    ))
  }

  function handleSave(plan: TenantPlan) {
    setSaving(plan)
    setTimeout(() => {
      // Flush draft for this plan into the global store
      const draft = configs.find(c => c.plan === plan)
      if (draft) {
        Object.entries(draft.features).forEach(([k, v]) =>
          storeUpdateFeat(plan, k as keyof PlanFeatures, v)
        )
        Object.entries(draft.limits).forEach(([k, v]) =>
          storeUpdateLim(plan, k as keyof PlanLimits, v as number)
        )
        storeUpdatePrc(plan, draft.price_monthly)
      }
      setSaving(null)
      showToast('success', `บันทึก Package ${plan} เรียบร้อยแล้ว — เมนู Admin อัปเดตทันที`)
    }, 800)
  }

  const tenantsByPlan = (plan: TenantPlan) => MOCK_TENANTS.filter(t => t.plan === plan).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>📦 จัดการ Package & Plan</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>กำหนด limits และ feature ของแต่ละ plan — มีผลกับ tenant ที่ใช้ plan นั้นทันที</p>
        </div>
        <button
          onClick={() => setCompareMode(m => !m)}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: compareMode ? '#4f46e5' : '#fff', color: compareMode ? '#fff' : '#374151',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {compareMode ? '✕ ปิดโหมดเปรียบเทียบ' : '⇄ เปรียบเทียบ Plans'}
        </button>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {PLAN_ORDER.map(plan => {
          const cfg = configs.find(c => c.plan === plan)!
          const tenantCount = tenantsByPlan(plan)
          const isEnterprise = plan === 'ENTERPRISE'

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
                      {isEnterprise ? 'ติดต่อเรา' : `฿${cfg.price_monthly.toLocaleString()}`}
                      {!isEnterprise && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}>/เดือน</span>}
                    </div>
                  </div>
                  <span style={{ background: '#fff', color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {tenantCount} Tenant
                  </span>
                </div>

                {/* Price input */}
                {!isEnterprise && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: '#6b7280', whiteSpace: 'nowrap' }}>ราคา ฿/เดือน</span>
                    <input
                      type="number"
                      value={cfg.price_monthly}
                      onChange={e => updatePrice(plan, Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ width: 90, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'inherit' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ── Limits section ── */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                    📏 จำนวนที่อนุญาต
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      { key: 'max_branches' as const,          label: 'จำนวนสาขา' },
                      { key: 'max_employees' as const,         label: 'จำนวนพนักงาน' },
                      { key: 'max_shifts_per_branch' as const, label: 'กะต่อสาขา/วัน' },
                      { key: 'max_managers' as const,          label: 'จำนวน Manager' },
                    ]).map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: '0.82rem', color: '#374151', minWidth: 0 }}>{label}</span>
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
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                    🔧 ฟีเจอร์
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {FEATURE_META.map(({ key, label, desc, icon }, i) => {
                      const enabled = cfg.features[key]
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
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{label}</div>
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

              {/* Save button */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => handleSave(plan)}
                  disabled={saving === plan}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                    cursor: saving === plan ? 'not-allowed' : 'pointer',
                    background: saving === plan ? '#e0e7ff' : cfg.color === '#374151' ? '#374151' : cfg.color,
                    color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                    transition: 'opacity 0.2s', opacity: saving === plan ? 0.7 : 1,
                  }}
                >
                  {saving === plan ? 'กำลังบันทึก…' : `💾 บันทึก ${cfg.label}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Active tenants per plan warning ── */}
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>⚠️ ผลกระทบต่อ Tenant ที่ใช้งานอยู่</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PLAN_ORDER.map(plan => {
            const cfg = configs.find(c => c.plan === plan)!
            const tenants = MOCK_TENANTS.filter(t => t.plan === plan)
            const overBranch = tenants.filter(t => cfg.limits.max_branches !== -1 && t.branch_count > cfg.limits.max_branches)
            const overEmp    = tenants.filter(t => cfg.limits.max_employees !== -1 && t.employee_count > cfg.limits.max_employees)
            const hasWarning = overBranch.length > 0 || overEmp.length > 0
            return (
              <div key={plan} style={{
                flex: '1 1 220px', padding: '12px 14px', borderRadius: 10,
                background: hasWarning ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${hasWarning ? '#fca5a5' : '#86efac'}`,
              }}>
                <div style={{ fontWeight: 700, color: cfg.color, fontSize: '0.85rem', marginBottom: 6 }}>{cfg.label}</div>
                {hasWarning ? (
                  <>
                    {overBranch.length > 0 && <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>⚠ {overBranch.length} tenant มีสาขาเกินลิมิต</div>}
                    {overEmp.length > 0    && <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>⚠ {overEmp.length} tenant มีพนักงานเกินลิมิต</div>}
                  </>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#16a34a' }}>✓ Tenant ทั้งหมดอยู่ในลิมิต</div>
                )}
              </div>
            )
          })}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
          * การลดลิมิตไม่ได้ลบข้อมูลที่มีอยู่ แต่จะป้องกันการเพิ่มข้อมูลใหม่เกินจำนวนที่กำหนด
        </p>
      </div>
    </div>
  )
}
