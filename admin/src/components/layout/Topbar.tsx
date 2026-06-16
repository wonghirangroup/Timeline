import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { User, ChevronRight, Key, LogOut, ChevronLeft, EyeOff, Eye, Menu, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../ui/Toast'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'ภาพรวมระบบ',
  '/employee':     'จัดการพนักงาน',
  '/branch':       'จัดการสาขา',
  '/shift':        'กะ & เวลา',
  '/leave':        'วันลา & ปฏิทิน',
  '/ot':           'จัดการ OT',
  '/report':       'สรุปผลรายงาน',
  '/announcement': 'ประกาศ & ข้อความ',
  '/settings':     'การตั้งค่า',
}

const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id) }, [])
  return now
}

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const bkk = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return `${bkk.getDate()} ${MONTHS_SHORT[bkk.getMonth()]} ${bkk.getFullYear() + 543} · ${pad(bkk.getHours())}:${pad(bkk.getMinutes())}`
}

interface TopbarProps {
  isMobile: boolean
  onMenuClick: () => void
}

export default function Topbar({ isMobile, onMenuClick }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const now = useClock()
  const title = PAGE_TITLES[location.pathname] ?? 'TimeLine HR'
  const name = useAuthStore(s => s.name)
  const role = useAuthStore(s => s.role)
  const clear = useAuthStore(s => s.clear)
  const setName = useAuthStore(s => s.setName)
  const initials = name ? name.slice(0, 2) : 'AD'

  const roleLabel = role === 'MANAGER' ? 'Manager' : 'Admin'
  const roleColor = role === 'MANAGER' ? { bg: '#dcfce7', color: '#15803d' } : { bg: '#fff7ed', color: '#c2410c' }

  // Profile panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [view, setView] = useState<'profile' | 'reset' | 'name'>('profile')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [nameInput, setNameInput] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click (desktop only)
  useEffect(() => {
    if (!panelOpen || isMobile) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [panelOpen, isMobile])

  function openPanel() {
    setView('profile')
    setPwForm({ current: '', next: '', confirm: '' })
    setShowPw({ current: false, next: false, confirm: false })
    setNameInput('')
    setPanelOpen(true)
  }

  function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) { showToast('warning', 'กรุณากรอกชื่อที่ต้องการแสดง'); return }
    setName(trimmed)
    showToast('success', `เปลี่ยนชื่อเป็น "${trimmed}" เรียบร้อยแล้ว`)
    setView('profile')
  }

  function handleResetPassword() {
    if (!pwForm.current) { showToast('warning', 'กรุณากรอกรหัสผ่านปัจจุบัน'); return }
    if (pwForm.next.length < 6) { showToast('warning', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (pwForm.next !== pwForm.confirm) { showToast('error', 'รหัสผ่านใหม่ไม่ตรงกัน'); return }
    showToast('success', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')
    setPanelOpen(false)
  }

  function handleLogout() {
    clear()
    navigate('/login')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 40px 9px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#111827', background: '#fff',
  }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }

  // ── Panel content ──────────────────────────────────────────────
  const panelContent = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Admin'}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 2 }}>admin@timeline.app</div>
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: roleColor.bg, color: roleColor.color, marginTop: 4, display: 'inline-block' }}>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      {view === 'profile' ? (
        <div style={{ padding: '12px 12px 8px' }}>
          <button
            onClick={() => { setNameInput(name || ''); setView('name') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={15} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>แก้ไขชื่อที่แสดง</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Display Name</div>
            </div>
            <ChevronRight size={14} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </button>

          <button
            onClick={() => setView('reset')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Key size={15} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>เปลี่ยนรหัสผ่าน</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Reset Password</div>
            </div>
            <ChevronRight size={14} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </button>

          <div style={{ height: 1, background: '#f1f5f9', margin: '8px 0' }} />

          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LogOut size={15} color="#ef4444" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>ออกจากระบบ</div>
          </button>
        </div>
      ) : view === 'reset' ? (
        <div style={{ padding: '16px 20px 20px' }}>
          {/* Back */}
          <button
            onClick={() => setView('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px', marginBottom: 16, padding: 0 }}
          >
            <ChevronLeft size={14} />
            กลับ
          </button>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: 16 }}>🔑 เปลี่ยนรหัสผ่าน</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Current password */}
            <div>
              <label style={labelStyle}>รหัสผ่านปัจจุบัน</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.current ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="••••••••"
                  style={inputStyle}
                />
                <button onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                  {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={labelStyle}>รหัสผ่านใหม่</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.next ? 'text' : 'password'}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  style={{ ...inputStyle, borderColor: pwForm.next && pwForm.next.length < 6 ? '#fca5a5' : '#e5e7eb' }}
                />
                <button onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                  {showPw.next ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwForm.next && pwForm.next.length < 6 && (
                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: 3 }}>ต้องมีอย่างน้อย 6 ตัวอักษร</div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={labelStyle}>ยืนยันรหัสผ่านใหม่</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                  style={{ ...inputStyle, borderColor: pwForm.confirm && pwForm.confirm !== pwForm.next ? '#fca5a5' : '#e5e7eb' }}
                />
                <button onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                  {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwForm.confirm && pwForm.confirm !== pwForm.next && (
                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: 3 }}>รหัสผ่านไม่ตรงกัน</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setView('profile')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
              ยกเลิก
            </button>
            <button onClick={handleResetPassword} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              บันทึก
            </button>
          </div>
        </div>
      ) : view === 'name' ? (
        <div style={{ padding: '16px 20px 20px' }}>
          {/* Back */}
          <button
            onClick={() => setView('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px', marginBottom: 16, padding: 0 }}
          >
            <ChevronLeft size={14} />
            กลับ
          </button>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: 16 }}>👤 แก้ไขชื่อที่แสดง</div>

          <div>
            <label style={labelStyle}>ชื่อที่ต้องการแสดง</label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="กรอกชื่อ..."
              maxLength={40}
              style={{ ...inputStyle, padding: '9px 12px' }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>ชื่อนี้จะแสดงบน Topbar และรายงาน</span>
              <span style={{ fontSize: '11px', color: nameInput.length > 35 ? '#f97316' : '#9ca3af' }}>{nameInput.length}/40</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setView('profile')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
              ยกเลิก
            </button>
            <button
              onClick={handleSaveName}
              disabled={!nameInput.trim()}
              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: nameInput.trim() ? '#f97316' : '#f3f4f6', color: nameInput.trim() ? '#fff' : '#9ca3af', fontSize: '13px', fontWeight: 600, cursor: nameInput.trim() ? 'pointer' : 'not-allowed' }}
            >
              บันทึก
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <>
      <header style={{
        position: 'fixed',
        left: isMobile ? 0 : 260,
        right: 0,
        top: 0,
        height: isMobile ? 56 : 64,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px',
        zIndex: 98,
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isMobile && (
            <button
              onClick={onMenuClick}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 8, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu size={20} />
            </button>
          )}
          <span style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {!isMobile && (
            <>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDateTime(now)}</span>
              <div style={{ width: '1px', height: 16, background: '#e5e7eb' }} />
            </>
          )}
          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: roleColor.bg, color: roleColor.color }}>{roleLabel}</span>

          {/* Clickable profile area */}
          <div ref={panelRef} style={{ position: 'relative' }}>
            <button
              onClick={openPanel}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, transition: 'background 0.15s' }}
              onMouseEnter={e => !isMobile && (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => !isMobile && (e.currentTarget.style.background = 'none')}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>{initials}</div>
              {!isMobile && (
                <>
                  <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 500 }}>{name || 'Admin'}</span>
                  <ChevronDown size={12} color="#9ca3af" />
                </>
              )}
            </button>

            {/* Desktop dropdown */}
            {!isMobile && panelOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                width: 320, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(0,0,0,0.05)',
                zIndex: 300, overflow: 'hidden',
                animation: 'fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}>
                {panelContent}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom sheet */}
      {isMobile && panelOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'flex-end', transition: 'opacity 0.2s' }}
          onClick={() => setPanelOpen(false)}
        >
          <div
            style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-float)' }}
            onClick={e => e.stopPropagation()}
            className="animate-fade-in-up"
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
            </div>
            {panelContent}
          </div>
        </div>
      )}
    </>
  )
}
