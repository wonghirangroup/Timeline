// employee/src/pages/verify/index.tsx
// หน้ายืนยันตัวตนครั้งแรก — เลือกชื่อจากรายการที่ Admin สร้างไว้

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_EMPLOYEE_LIST } from '../../lib/mock'
import type { EmployeeListItem } from '../../types'

type Step = 'select' | 'confirm' | 'success'

const AVATAR_COLORS = [
  'linear-gradient(135deg,#ff6b35,#ffab40)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#8b5cf6,#a78bfa)',
  'linear-gradient(135deg,#16a34a,#4ade80)',
  'linear-gradient(135deg,#d97706,#fbbf24)',
  'linear-gradient(135deg,#db2777,#f472b6)',
]

export default function VerifyPage() {
  const navigate = useNavigate()
  const [step, setStep]         = useState<Step>('select')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<EmployeeListItem | null>(null)
  const [code, setCode]         = useState('')
  const [codeError, setCodeError] = useState('')

  const filtered = MOCK_EMPLOYEE_LIST.filter(e =>
    e.full_name.includes(search) ||
    e.position.includes(search) ||
    e.branch_name.includes(search)
  )

  function selectEmployee(emp: EmployeeListItem) {
    setSelected(emp)
    setCode('')
    setCodeError('')
    setStep('confirm')
  }

  function handleVerify() {
    if (!selected) return
    if (code.trim() !== selected.employee_code) {
      setCodeError('รหัสพนักงานไม่ถูกต้อง กรุณาลองใหม่')
      return
    }
    setStep('success')
    setTimeout(() => navigate('/checkin'), 2200)
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: '40px 24px', background: 'var(--bg-page)',
      }}>
        <div className="animate-success-pop" style={{ fontSize: '5rem', lineHeight: 1 }}>🎉</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ยืนยันตัวตนสำเร็จ!
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            ยินดีต้อนรับ คุณ{selected?.full_name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            กำลังพาคุณไปหน้าเช็คอิน...
          </div>
        </div>
      </div>
    )
  }

  // ── Confirm step ─────────────────────────────────────────────────────────────
  if (step === 'confirm' && selected) {
    const idx = MOCK_EMPLOYEE_LIST.findIndex(e => e.id === selected.id)
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '24px 16px', background: 'var(--bg-page)', minHeight: '100dvh' }}>
        <button
          onClick={() => { setStep('select'); setSelected(null) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--accent-start)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 28,
          }}
        >
          ← ย้อนกลับ
        </button>

        {/* Selected card */}
        <div className="glass-card animate-slide-up" style={{ padding: '24px 20px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 auto 14px',
          }}>
            {selected.full_name.charAt(0)}
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {selected.full_name}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {selected.position} · {selected.branch_name}
          </div>
        </div>

        {/* Code input */}
        <div className="glass-card animate-slide-up" style={{ padding: '22px 20px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            กรอกรหัสพนักงาน
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.55 }}>
            ใส่รหัสที่ HR แจ้งให้คุณไว้ เพื่อยืนยันว่าเป็นตัวคุณจริง
          </div>

          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value); setCodeError('') }}
            placeholder="รหัสพนักงาน"
            maxLength={10}
            autoFocus
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              border: `2px solid ${codeError ? 'var(--error)' : 'rgba(255,107,53,0.25)'}`,
              fontSize: '1.2rem', fontWeight: 700, letterSpacing: '6px',
              textAlign: 'center', background: 'rgba(255,255,255,0.85)',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />

          {codeError && (
            <div className="animate-slide-down" style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: 8, textAlign: 'center' }}>
              ⚠️ {codeError}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={!code}
            style={{
              width: '100%', marginTop: 18, padding: '16px',
              borderRadius: 16, border: 'none',
              cursor: code ? 'pointer' : 'not-allowed',
              background: code
                ? 'linear-gradient(135deg, var(--accent-start), var(--accent-end))'
                : 'rgba(0,0,0,0.08)',
              color: code ? '#fff' : 'var(--text-muted)',
              fontSize: '1rem', fontWeight: 700,
              boxShadow: code ? '0 4px 16px rgba(255,107,53,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            ✅ ยืนยันตัวตน
          </button>
        </div>
      </div>
    )
  }

  // ── Select step ──────────────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '32px 20px 22px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.55rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          ยินดีต้อนรับ 👋
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          กรุณาเลือกชื่อของคุณจากรายการ<br />เพื่อเริ่มใช้งานระบบเช็คชื่อ
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ หรือ สาขา..."
            style={{
              width: '100%', padding: '13px 14px 13px 42px',
              borderRadius: 14, border: '1.5px solid rgba(255,107,53,0.2)',
              fontSize: '0.9rem', background: 'rgba(255,255,255,0.88)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Employee list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((emp, i) => (
            <button
              key={emp.id}
              onClick={() => selectEmployee(emp)}
              className="glass-card animate-slide-up"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 20,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                border: '1.5px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                animationDelay: `${i * 40}ms`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 700, color: '#fff',
              }}>
                {emp.full_name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {emp.full_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {emp.position} · {emp.branch_name}
                </div>
              </div>
              <span style={{ color: 'var(--accent-start)', fontSize: '1.3rem', flexShrink: 0, opacity: 0.7 }}>›</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>ไม่พบชื่อที่ค้นหา</div>
              <div style={{ fontSize: '0.82rem', marginTop: 4 }}>ลองค้นหาด้วยคำอื่น</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
