import { useState } from 'react'

type Status = 'active' | 'suspended' | 'trial'
type Plan = 'Starter' | 'Pro' | 'Enterprise'

interface Tenant {
  id: string; abbr: string; name: string; email: string
  plan: Plan; employees: number; branches: number
  status: Status; lineConfigured: boolean; joined: string
}

const mockTenants: Tenant[] = [
  { id: 't1', abbr: 'ดท', name: 'บริษัท ดิจิทัลโซลูชั่น จำกัด', email: 'admin@digital.co.th', plan: 'Enterprise', employees: 380, branches: 8, status: 'active', lineConfigured: true, joined: '1 เม.ย. 2569' },
  { id: 't2', abbr: 'ทบ', name: 'บริษัท ไทยเบเวอเรจ จำกัด', email: 'hr@thaibev.co.th', plan: 'Pro', employees: 120, branches: 3, status: 'active', lineConfigured: true, joined: '10 พ.ค. 2569' },
  { id: 't3', abbr: 'มด', name: 'บริษัท มีดี โลจิสติกส์ จำกัด', email: 'admin@meedee.co.th', plan: 'Pro', employees: 210, branches: 5, status: 'active', lineConfigured: true, joined: '22 เม.ย. 2569' },
  { id: 't4', abbr: 'สจ', name: 'ห้างหุ้นส่วน สมใจ จำกัด', email: 'contact@somjai.co.th', plan: 'Starter', employees: 45, branches: 1, status: 'active', lineConfigured: false, joined: '3 พ.ค. 2569' },
  { id: 't5', abbr: 'ฟม', name: 'บริษัท เฟรชมาร์ท จำกัด', email: 'info@freshmart.co.th', plan: 'Starter', employees: 30, branches: 2, status: 'suspended', lineConfigured: true, joined: '15 เม.ย. 2569' },
  { id: 't6', abbr: 'อท', name: 'บริษัท อินโนเวทีฟ เทค', email: 'ceo@innotech.co.th', plan: 'Enterprise', employees: 520, branches: 12, status: 'active', lineConfigured: true, joined: '10 มี.ค. 2569' },
  { id: 't7', abbr: 'ซก', name: 'บริษัท ซันไรส์ กรุ๊ป จำกัด', email: 'hr@sunrise.co.th', plan: 'Pro', employees: 88, branches: 2, status: 'trial', lineConfigured: false, joined: '15 พ.ค. 2569' },
  { id: 't8', abbr: 'ทฟ', name: 'บริษัท ไทยฟู้ด อินดัสทรี', email: 'admin@thaifood.co.th', plan: 'Starter', employees: 62, branches: 1, status: 'active', lineConfigured: true, joined: '25 มี.ค. 2569' },
]

const planStyle: Record<Plan, { bg: string; color: string }> = {
  Starter: { bg: '#f1f5f9', color: '#475569' },
  Pro: { bg: '#dbeafe', color: '#1d4ed8' },
  Enterprise: { bg: '#ede9fe', color: '#6d28d9' },
}

const statusConfig: Record<Status, { dot: string; text: string; bg: string; label: string }> = {
  active:    { dot: '#10b981', text: '#065f46', bg: '#d1fae530', label: 'Active' },
  suspended: { dot: '#f43f5e', text: '#9f1239', bg: '#fee2e230', label: 'Suspended' },
  trial:     { dot: '#f59e0b', text: '#92400e', bg: '#fef3c730', label: 'Trial' },
}

const card: React.CSSProperties = {
  background: 'white', borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden',
}

function Modal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', plan: 'Starter' as Plan })
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '420px', margin: '0 16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>เพิ่ม Tenant ใหม่</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>กรอกข้อมูลบริษัทลูกค้า</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            ชื่อบริษัท *
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="บริษัท ตัวอย่าง จำกัด"
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            อีเมล Admin *
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@company.co.th"
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            แผนการใช้งาน
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {(['Starter', 'Pro', 'Enterprise'] as Plan[]).map(p => (
                <button key={p} onClick={() => setForm({ ...form, plan: p })}
                  style={{ padding: '7px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: `2px solid ${form.plan === p ? planStyle[p].color : '#e2e8f0'}`, background: form.plan === p ? planStyle[p].bg : 'white', color: form.plan === p ? planStyle[p].color : '#64748b' }}>
                  {p}
                </button>
              ))}
            </div>
          </label>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400e', display: 'flex', gap: '8px' }}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: '1px', color: '#f59e0b' }}><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            หลังสร้าง Tenant ต้อง Setup Line OA ที่หน้า Line Config ก่อนพนักงานจะใช้งานได้
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', padding: '0 20px 16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>ยกเลิก</button>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white' }}>สร้าง Tenant</button>
        </div>
      </div>
    </div>
  )
}

export default function TenantsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all')
  const [showModal, setShowModal] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants)

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    return (t.name.toLowerCase().includes(q) || t.email.includes(q)) && (filterStatus === 'all' || t.status === filterStatus)
  })

  const toggleStatus = (id: string) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t))
  }

  const tabs = [
    { key: 'all' as const, label: 'ทั้งหมด', count: tenants.length },
    { key: 'active' as const, label: 'Active', count: tenants.filter(t => t.status === 'active').length },
    { key: 'trial' as const, label: 'Trial', count: tenants.filter(t => t.status === 'trial').length },
    { key: 'suspended' as const, label: 'Suspended', count: tenants.filter(t => t.status === 'suspended').length },
  ]

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Tenants</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>บริษัทลูกค้าที่ใช้งาน Platform ทั้งหมด</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          เพิ่ม Tenant
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อบริษัท หรืออีเมล..."
            style={{ paddingLeft: '32px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', fontSize: '13px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', width: '240px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} />
        </div>
        <div style={{ display: 'flex', background: 'white', borderRadius: '8px', padding: '3px', gap: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid rgba(15,23,42,0.06)' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filterStatus === tab.key ? '#6366f1' : 'transparent', color: filterStatus === tab.key ? 'white' : '#64748b' }}>
              {tab.label}
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '99px', background: filterStatus === tab.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filterStatus === tab.key ? 'white' : '#94a3b8' }}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['บริษัท', 'แผน', 'พนักงาน / สาขา', 'Line OA', 'สถานะ', 'เริ่มใช้', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ไม่พบ tenant ที่ค้นหา</td></tr>
            ) : filtered.map((t, i) => {
              const sc = statusConfig[t.status]
              const pl = planStyle[t.plan]
              return (
                <tr key={t.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f8fafc', background: 'white' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: pl.bg, color: pl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>{t.abbr}</div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{t.name}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: pl.bg, color: pl.color }}>{t.plan}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ fontWeight: 600, color: '#374151', margin: 0 }}>{t.employees.toLocaleString()} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '11px' }}>คน</span></p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{t.branches} สาขา</p>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {t.lineConfigured ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#059669' }}>
                        <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        ตั้งค่าแล้ว
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#d97706' }}>
                        <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        ยังไม่ตั้งค่า
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: sc.bg, color: sc.text }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>{t.joined}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 500, background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>ดู</button>
                      <button onClick={() => toggleStatus(t.id)} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 500, border: 'none', borderRadius: '6px', cursor: 'pointer', background: t.status === 'active' || t.status === 'trial' ? '#fff1f2' : '#d1fae5', color: t.status === 'active' || t.status === 'trial' ? '#be123c' : '#065f46' }}>
                        {t.status === 'active' || t.status === 'trial' ? 'ระงับ' : 'เปิดใช้'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f8fafc', background: '#fafafa', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>แสดง <strong style={{ color: '#64748b' }}>{filtered.length}</strong> จาก {tenants.length} tenants</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {tenants.filter(t => t.status === 'active').length} active
          </span>
        </div>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </div>
  )
}
