import { useState } from 'react'

interface Plan {
  id: string
  name: string
  price: number
  maxEmployees: number
  maxBranches: number
  features: string[]
  color: string
  bg: string
  tenantCount: number
  isPopular?: boolean
}

const initialPlans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 990,
    maxEmployees: 50,
    maxBranches: 1,
    features: ['เช็คชื่อผ่าน Line LIFF', 'จัดการวันลา', 'รายงานพื้นฐาน', 'Line OA 1 บัญชี'],
    color: '#475569',
    bg: '#f1f5f9',
    tenantCount: 8,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2490,
    maxEmployees: 200,
    maxBranches: 5,
    features: ['ทุกอย่างใน Starter', 'รายงานขั้นสูง', 'หลายสาขา (5 สาขา)', 'Export Excel/PDF', 'Priority Support'],
    color: '#1d4ed8',
    bg: '#dbeafe',
    tenantCount: 14,
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 5990,
    maxEmployees: 9999,
    maxBranches: 9999,
    features: ['ทุกอย่างใน Pro', 'ไม่จำกัดพนักงาน', 'ไม่จำกัดสาขา', 'Custom Report', 'SLA 99.9%', 'Dedicated Support'],
    color: '#6d28d9',
    bg: '#ede9fe',
    tenantCount: 3,
  },
]

type ModalMode = 'edit' | 'create' | null

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editTarget, setEditTarget] = useState<Plan | null>(null)
  const [form, setForm] = useState({ name: '', price: '', maxEmployees: '', maxBranches: '', features: '' })

  const openEdit = (p: Plan) => {
    setEditTarget(p)
    setForm({
      name: p.name,
      price: String(p.price),
      maxEmployees: p.maxEmployees >= 9999 ? '' : String(p.maxEmployees),
      maxBranches: p.maxBranches >= 9999 ? '' : String(p.maxBranches),
      features: p.features.join('\n'),
    })
    setModalMode('edit')
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', price: '', maxEmployees: '', maxBranches: '', features: '' })
    setModalMode('create')
  }

  const handleSave = () => {
    const features = form.features.split('\n').map(s => s.trim()).filter(Boolean)
    if (modalMode === 'edit' && editTarget) {
      setPlans(prev => prev.map(p => p.id === editTarget.id ? {
        ...p,
        name: form.name || p.name,
        price: Number(form.price) || p.price,
        maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : 9999,
        maxBranches: form.maxBranches ? Number(form.maxBranches) : 9999,
        features: features.length ? features : p.features,
      } : p))
    } else {
      const newPlan: Plan = {
        id: Date.now().toString(),
        name: form.name,
        price: Number(form.price),
        maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : 9999,
        maxBranches: form.maxBranches ? Number(form.maxBranches) : 9999,
        features,
        color: '#475569',
        bg: '#f1f5f9',
        tenantCount: 0,
      }
      setPlans(prev => [...prev, newPlan])
    }
    setModalMode(null)
  }

  const totalTenants = plans.reduce((s, p) => s + p.tenantCount, 0)
  const totalMRR = plans.reduce((s, p) => s + p.price * p.tenantCount, 0)

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Plans</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>จัดการแพ็กเกจและราคาสำหรับ tenant</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', fontSize: '13px', fontWeight: 600,
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่ม Plan
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'แพ็กเกจทั้งหมด', value: plans.length, sub: 'แผนที่เปิดขาย', color: '#6366f1', bg: '#eef2ff' },
          { label: 'Tenant ทั้งหมด', value: totalTenants, sub: 'ใช้งานอยู่', color: '#10b981', bg: '#ecfdf5' },
          { label: 'MRR รวม', value: `฿${totalMRR.toLocaleString()}`, sub: 'ต่อเดือน', color: '#f59e0b', bg: '#fffbeb' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'white', borderRadius: '12px', padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 }}>{k.label}</p>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: k.color }} />
              </div>
            </div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{k.value}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} onEdit={openEdit} />
        ))}
      </div>

      {/* Tenant distribution table */}
      <div style={{
        background: 'white', borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>การกระจาย Tenant ตามแพ็กเกจ</p>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {plans.map(plan => {
            const pct = totalTenants > 0 ? Math.round((plan.tenantCount / totalTenants) * 100) : 0
            return (
              <div key={plan.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                      background: plan.bg, color: plan.color,
                    }}>{plan.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{plan.tenantCount} tenants</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: plan.color, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}
          onClick={() => setModalMode(null)}
        >
          <div style={{
            background: 'white', borderRadius: '16px', width: '460px', maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', margin: 0 }}>
                {modalMode === 'edit' ? `แก้ไข Plan: ${editTarget?.name}` : 'เพิ่ม Plan ใหม่'}
              </p>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <ModalField label="ชื่อ Plan">
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น Pro, Enterprise"
                  style={inputStyle}
                />
              </ModalField>
              <ModalField label="ราคา (บาท/เดือน)">
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="เช่น 2490"
                  style={inputStyle}
                />
              </ModalField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ModalField label="จำนวนพนักงานสูงสุด">
                  <input
                    type="number"
                    value={form.maxEmployees}
                    onChange={e => setForm({ ...form, maxEmployees: e.target.value })}
                    placeholder="ว่าง = ไม่จำกัด"
                    style={inputStyle}
                  />
                </ModalField>
                <ModalField label="จำนวนสาขาสูงสุด">
                  <input
                    type="number"
                    value={form.maxBranches}
                    onChange={e => setForm({ ...form, maxBranches: e.target.value })}
                    placeholder="ว่าง = ไม่จำกัด"
                    style={inputStyle}
                  />
                </ModalField>
              </div>
              <ModalField label="Features (1 บรรทัด = 1 feature)">
                <textarea
                  value={form.features}
                  onChange={e => setForm({ ...form, features: e.target.value })}
                  rows={5}
                  placeholder={'เช็คชื่อผ่าน Line LIFF\nจัดการวันลา\nรายงานพื้นฐาน'}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </ModalField>
            </div>

            <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setModalMode(null)}
                style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.price}
                style={{
                  flex: 2, padding: '9px', fontSize: '13px', fontWeight: 600,
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white',
                  opacity: (!form.name || !form.price) ? 0.5 : 1,
                }}
              >
                {modalMode === 'edit' ? 'บันทึกการแก้ไข' : 'เพิ่ม Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: '8px', border: '1px solid #e2e8f0',
  outline: 'none', boxSizing: 'border-box', color: '#1e293b',
}

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: (p: Plan) => void }) {
  const mrr = plan.price * plan.tenantCount
  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)',
      overflow: 'hidden', position: 'relative',
    }}>
      {plan.isPopular && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
          background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white',
        }}>
          ยอดนิยม
        </div>
      )}

      {/* Plan header */}
      <div style={{ padding: '18px 18px 14px' }}>
        <span style={{
          display: 'inline-block', fontSize: '11px', fontWeight: 700,
          padding: '3px 10px', borderRadius: '99px',
          background: plan.bg, color: plan.color, marginBottom: '10px',
        }}>{plan.name}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>฿{plan.price.toLocaleString()}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>/เดือน</span>
        </div>
      </div>

      <div style={{ height: '1px', background: '#f1f5f9', margin: '0 18px' }} />

      {/* Limits */}
      <div style={{ padding: '12px 18px', display: 'flex', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {plan.maxEmployees >= 9999 ? '∞' : plan.maxEmployees}
          </p>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>พนักงาน</p>
        </div>
        <div style={{ width: '1px', background: '#f1f5f9' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {plan.maxBranches >= 9999 ? '∞' : plan.maxBranches}
          </p>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>สาขา</p>
        </div>
        <div style={{ width: '1px', background: '#f1f5f9' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{plan.tenantCount}</p>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>tenants</p>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', margin: 0 }}>฿{mrr.toLocaleString()}</p>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>MRR</p>
        </div>
      </div>

      <div style={{ height: '1px', background: '#f1f5f9', margin: '0 18px' }} />

      {/* Features */}
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20" style={{ color: plan.color, flexShrink: 0 }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span style={{ fontSize: '12px', color: '#475569' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Edit button */}
      <div style={{ padding: '0 18px 16px' }}>
        <button
          onClick={() => onEdit(plan)}
          style={{
            width: '100%', padding: '8px', fontSize: '12px', fontWeight: 600,
            borderRadius: '8px', border: `1px solid ${plan.color}33`,
            background: plan.bg, color: plan.color, cursor: 'pointer',
          }}
        >
          แก้ไข Plan
        </button>
      </div>
    </div>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}
