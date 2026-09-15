// admin/src/pages/magic-login/index.tsx
// auto-login ครั้งเดียวจากลิงก์แจ้งเตือนไลน์ / ปุ่ม "สลับไปเว็บแอดมิน" ใน LIFF —
// feedback 2026-09-15 "กดเข้าจากแจ้งเตือนไลน์/หน้าโปรไฟล์ อยากให้ login อัตโนมัติเลย"
// จงใจอยู่นอก Layout เหมือนหน้า /login (ยังไม่มี token ตอนเข้าหน้านี้)
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export default function MagicLoginPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sp.get('token')
    if (!token) { setError('ลิงก์ไม่ถูกต้อง'); return }

    axios.post(`${API_URL}/api/v1/auth/magic-login`, { token })
      .then(res => {
        const { accessToken, user, next_path } = res.data.data
        const displayName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email
        setAuth(accessToken, user.role as Role, user.tenant_id ?? '', displayName, user.enabled_features ?? null)
        navigate(next_path || '/dashboard', { replace: true })
      })
      .catch(err => {
        setError(err.response?.data?.error?.message ?? 'ลิงก์หมดอายุหรือถูกใช้ไปแล้ว')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {error ? (
          <>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <AlertCircle size={22} />
            </div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: '0 0 6px' }}>เข้าสู่ระบบอัตโนมัติไม่สำเร็จ</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)', margin: '0 0 18px' }}>{error}</p>
            <button onClick={() => navigate('/login', { replace: true })}
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              ไปหน้าล็อกอิน
            </button>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin" size={26} color="#f97316" style={{ margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 600, fontSize: '13.5px', color: '#374151', margin: 0 }}>กำลังเข้าสู่ระบบ...</p>
          </>
        )}
      </div>
    </div>
  )
}
