// admin/src/components/layout/SuperAdminTopbar.tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../ui/Toast'

const PAGE_TITLES: Record<string, string> = {
  '/superadmin/dashboard': 'ภาพรวม Platform',
  '/superadmin/tenants':   'จัดการ Tenant',
  '/superadmin/packages':  'Package & Plan',
  '/superadmin/billing':    'Billing & Payment',
  '/superadmin/onboarding':    'Onboarding Checklist',
  '/superadmin/announcement':  'System Announcement',
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type View = 'profile' | 'reset' | 'name'

export default function SuperAdminTopbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const now = useClock()
  const { showToast } = useToast()
  const name = useAuthStore(s => s.name) ?? 'Super Admin'
  const setName = useAuthStore(s => s.setName)
  const clear = useAuthStore(s => s.clear)
  const title = PAGE_TITLES[location.pathname] ?? 'Super Admin'

  const [panelOpen, setPanelOpen] = useState(false)
  const [view, setView] = useState<View>('profile')
  const [nameInput, setNameInput] = useState(name)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
        setView('profile')
      }
    }
    if (panelOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelOpen])

  function handleLogout() {
    clear()
    navigate('/login', { replace: true })
  }

  function handleSaveName() {
    if (!nameInput.trim()) return
    setName(nameInput.trim())
    showToast('success', 'บันทึกชื่อที่แสดงเรียบร้อยแล้ว')
    setView('profile')
    setPanelOpen(false)
  }

  function handleResetPw() {
    if (pwForm.next.length < 6) { showToast('error', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (pwForm.next !== pwForm.confirm) { showToast('error', 'รหัสผ่านไม่ตรงกัน'); return }
    showToast('success', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')
    setPwForm({ current: '', next: '', confirm: '' })
    setView('profile')
    setPanelOpen(false)
  }

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'SA'

  return (
    <header style={{
      position: 'fixed', left: 220, right: 0, top: 0, height: 56,
      background: '#fff', borderBottom: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 99,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: '#ede9fe', color: '#4f46e5', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>SUPER ADMIN</span>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{formatDateTime(now)}</span>

        {/* Avatar button */}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button
            onClick={() => { setPanelOpen(p => !p); setView('profile'); setNameInput(name) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8 }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#818cf8,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: '#fff',
            }}>{initials}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600, lineHeight: 1.2 }}>{name}</div>
              <div style={{ fontSize: '0.7rem', color: '#818cf8' }}>Super Admin</div>
            </div>
            <svg width="12" height="12" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ transform: panelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {panelOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 300, background: '#fff', borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #e5e7eb',
              zIndex: 300, overflow: 'hidden',
            }}>

              {/* ── PROFILE VIEW ── */}
              {view === 'profile' && (
                <>
                  <div style={{ padding: '16px', background: 'linear-gradient(135deg,#4f46e5,#6d28d9)', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '0 auto 8px', border: '2px solid rgba(255,255,255,0.4)' }}>{initials}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginTop: 2 }}>Super Administrator</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>🔐 สิทธิ์สูงสุด</div>
                  </div>

                  <div style={{ padding: '8px' }}>
                    <button
                      onClick={() => { setNameInput(name); setView('name') }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="15" height="15" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      แก้ไขชื่อที่แสดง
                    </button>
                    <button
                      onClick={() => setView('reset')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="15" height="15" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      เปลี่ยนรหัสผ่าน
                    </button>

                    <div style={{ margin: '4px 0', borderTop: '1px solid #f3f4f6' }} />

                    <button
                      onClick={handleLogout}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#ef4444', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="15" height="15" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      ออกจากระบบ
                    </button>
                  </div>
                </>
              )}

              {/* ── RESET PASSWORD VIEW ── */}
              {view === 'reset' && (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setView('profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>เปลี่ยนรหัสผ่าน</span>
                  </div>
                  {(['current', 'next', 'confirm'] as const).map((k, i) => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                        {['รหัสผ่านปัจจุบัน', 'รหัสผ่านใหม่', 'ยืนยันรหัสผ่านใหม่'][i]}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPw[k] ? 'text' : 'password'}
                          value={pwForm[k]}
                          onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 36px 8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPw[k]
                              ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></>
                              : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                          </svg>
                        </button>
                      </div>
                      {k === 'confirm' && pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#ef4444' }}>รหัสผ่านไม่ตรงกัน</p>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleResetPw}
                    style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', marginTop: 4 }}
                  >เปลี่ยนรหัสผ่าน</button>
                </div>
              )}

              {/* ── EDIT NAME VIEW ── */}
              {view === 'name' && (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setView('profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>แก้ไขชื่อที่แสดง</span>
                  </div>
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value.slice(0, 40))}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    placeholder="ชื่อที่แสดง"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{nameInput.length}/40</span>
                  </div>
                  <button
                    onClick={handleSaveName}
                    disabled={!nameInput.trim()}
                    style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: nameInput.trim() ? '#4f46e5' : '#f3f4f6', color: nameInput.trim() ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: '0.875rem', cursor: nameInput.trim() ? 'pointer' : 'not-allowed', marginTop: 6 }}
                  >บันทึก</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
