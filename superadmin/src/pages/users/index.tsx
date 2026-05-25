import { useState } from 'react'

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'
interface User { id: string; name: string; email: string; role: Role; tenant?: string; lastLogin: string; active: boolean }

const mockUsers: User[] = [
  { id: 'u1', name: 'ศักดิ์ชัย วงษ์วิวัฒน์', email: 'sakchai@timeline.co', role: 'SUPER_ADMIN', lastLogin: '19 พ.ค., 09:12', active: true },
  { id: 'u2', name: 'นภัสสร จันทร์เพ็ญ', email: 'naphat@timeline.co', role: 'SUPER_ADMIN', lastLogin: '18 พ.ค., 15:45', active: true },
  { id: 'u3', name: 'ประวิทย์ ศิริมังคลา', email: 'admin@digital.co.th', role: 'ADMIN', tenant: 'บริษัท ดิจิทัลโซลูชั่น จำกัด', lastLogin: '19 พ.ค., 08:30', active: true },
  { id: 'u4', name: 'สุภาพร คงเดชา', email: 'hr@thaibev.co.th', role: 'ADMIN', tenant: 'บริษัท ไทยเบเวอเรจ จำกัด', lastLogin: '17 พ.ค., 11:20', active: true },
  { id: 'u5', name: 'วรรณา พิมพ์ทอง', email: 'manager@digital.co.th', role: 'MANAGER', tenant: 'บริษัท ดิจิทัลโซลูชั่น จำกัด', lastLogin: '16 พ.ค., 13:05', active: true },
  { id: 'u6', name: 'อดิศร ฤทธิ์ขจร', email: 'adisorn@meedee.co.th', role: 'ADMIN', tenant: 'บริษัท มีดี โลจิสติกส์ จำกัด', lastLogin: '14 พ.ค., 10:00', active: false },
]

const roleStyle: Record<Role, { label: string; bg: string; color: string; avBg: string; avColor: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', bg: '#ede9fe', color: '#6d28d9', avBg: '#ddd6fe', avColor: '#5b21b6' },
  ADMIN:       { label: 'Admin',       bg: '#dbeafe', color: '#1d4ed8', avBg: '#bfdbfe', avColor: '#1e40af' },
  MANAGER:     { label: 'Manager',     bg: '#d1fae5', color: '#065f46', avBg: '#a7f3d0', avColor: '#064e3b' },
}

const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('')

const card: React.CSSProperties = {
  background: 'white', borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden',
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'ADMIN' as Role, tenant: '' })
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '420px', margin: '0 16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>เชิญผู้ใช้ใหม่</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>ระบบจะส่งอีเมลเชิญให้อัตโนมัติ</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {['name', 'email'].map(field => (
            <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
              {field === 'name' ? 'ชื่อ-นามสกุล *' : 'อีเมล *'}
              <input type={field === 'email' ? 'email' : 'text'} placeholder={field === 'name' ? 'ชื่อ นามสกุล' : 'email@company.co.th'} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }} />
            </label>
          ))}
          <div>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#374151', margin: '0 0 6px' }}>Role *</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as Role[]).map(r => {
                const s = roleStyle[r]; const active = form.role === r
                return (
                  <button key={r} onClick={() => setForm({ ...form, role: r })}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: `2px solid ${active ? s.color : '#e2e8f0'}`, background: active ? s.bg : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: active ? s.avBg : '#f1f5f9', color: active ? s.avColor : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{r[0]}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: active ? s.color : '#374151', margin: 0 }}>{s.label}</p>
                      <p style={{ fontSize: '11px', color: active ? s.color : '#9ca3af', margin: '1px 0 0' }}>
                        {r === 'SUPER_ADMIN' ? 'เข้าถึงข้อมูลทุก tenant' : r === 'ADMIN' ? 'จัดการ tenant ของตัวเอง' : 'ดู branch ที่ดูแลเท่านั้น'}
                      </p>
                    </div>
                    {active && <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ color: s.color, flexShrink: 0 }}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                  </button>
                )
              })}
            </div>
          </div>
          {form.role !== 'SUPER_ADMIN' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
              Tenant *
              <select value={form.tenant} onChange={e => setForm({ ...form, tenant: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}>
                <option value="">เลือก tenant</option>
                <option value="t1">บริษัท ดิจิทัลโซลูชั่น จำกัด</option>
                <option value="t2">บริษัท ไทยเบเวอเรจ จำกัด</option>
                <option value="t3">บริษัท มีดี โลจิสติกส์ จำกัด</option>
              </select>
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', padding: '0 20px 16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>ยกเลิก</button>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white' }}>ส่งคำเชิญ</button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | Role>('all')
  const [showModal, setShowModal] = useState(false)

  const filtered = mockUsers.filter(u => {
    const q = search.toLowerCase()
    return (u.name.toLowerCase().includes(q) || u.email.includes(q)) && (filterRole === 'all' || u.role === filterRole)
  })

  const tabs = [
    { key: 'all' as const, label: 'ทั้งหมด', count: mockUsers.length },
    { key: 'SUPER_ADMIN' as const, label: 'Super Admin', count: mockUsers.filter(u => u.role === 'SUPER_ADMIN').length },
    { key: 'ADMIN' as const, label: 'Admin', count: mockUsers.filter(u => u.role === 'ADMIN').length },
    { key: 'MANAGER' as const, label: 'Manager', count: mockUsers.filter(u => u.role === 'MANAGER').length },
  ]

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Users</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>ผู้ใช้งานระบบทั้งหมด {mockUsers.length} คน</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          เชิญผู้ใช้
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {(['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as Role[]).map(r => {
          const s = roleStyle[r]; const count = mockUsers.filter(u => u.role === r).length
          return (
            <div key={r} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.avBg, color: s.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>{count}</div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: 0, fontSize: '13px' }}>{s.label}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{count} คน</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ หรืออีเมล..."
            style={{ paddingLeft: '32px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', fontSize: '13px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', width: '220px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} />
        </div>
        <div style={{ display: 'flex', background: 'white', borderRadius: '8px', padding: '3px', gap: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid rgba(15,23,42,0.06)' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilterRole(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', background: filterRole === tab.key ? '#6366f1' : 'transparent', color: filterRole === tab.key ? 'white' : '#64748b' }}>
              {tab.label}
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '99px', background: filterRole === tab.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filterRole === tab.key ? 'white' : '#94a3b8' }}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['ผู้ใช้', 'Role', 'Tenant', 'Login ล่าสุด', 'สถานะ', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ไม่พบผู้ใช้ที่ค้นหา</td></tr>
            ) : filtered.map((u, i) => {
              const rs = roleStyle[u.role]
              return (
                <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f8fafc' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: rs.avBg, color: rs.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>{initials(u.name)}</div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{u.name}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: rs.bg, color: rs.color }}>{rs.label}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748b' }}>{u.tenant ?? <span style={{ color: '#e2e8f0' }}>—</span>}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>{u.lastLogin}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: u.active ? '#d1fae5' : '#f1f5f9', color: u.active ? '#065f46' : '#94a3b8' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: u.active ? '#10b981' : '#cbd5e1', display: 'inline-block' }} />
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 500, background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>แก้ไข</button>
                      <button style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 500, background: '#fff1f2', color: '#be123c', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>ลบ</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f8fafc', background: '#fafafa', fontSize: '11px', color: '#94a3b8' }}>
          แสดง <strong style={{ color: '#64748b' }}>{filtered.length}</strong> จาก {mockUsers.length} ผู้ใช้
        </div>
      </div>

      {showModal && <InviteModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
