// admin/src/components/layout/ForcedPasswordChange.tsx
// เกตบังคับเปลี่ยนรหัสผ่านครั้งแรก — แสดงทับทั้งจอเมื่อ /auth/me คืน must_change_password
// (แอดมินที่ Super Admin สร้างให้ด้วยรหัสชั่วคราว ต้องตั้งรหัสของตัวเองก่อนใช้งาน)
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../ui/Toast'

export default function ForcedPasswordChange() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const mut = useMutation({
    mutationFn: () => api.post('/api/v1/auth/change-password', { current_password: cur, new_password: next }),
    onSuccess: () => {
      showToast('success', 'ตั้งรหัสผ่านใหม่เรียบร้อย')
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
    onError: (err: any) => showToast('error',
      err.response?.data?.error?.code === 'WRONG_PASSWORD' ? 'รหัสผ่านชั่วคราวไม่ถูกต้อง' : 'เปลี่ยนไม่สำเร็จ'),
  })

  const valid = cur && next.length >= 6 && next === confirm && next !== cur

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}><Lock size={20} /></div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>ตั้งรหัสผ่านใหม่ก่อนใช้งาน</p>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>บัญชีนี้ยังใช้รหัสผ่านชั่วคราวที่ผู้ดูแลระบบตั้งให้ กรุณาเปลี่ยนเป็นรหัสของคุณเองเพื่อความปลอดภัย</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 11 }}>
          <div><label style={lbl}>รหัสผ่านชั่วคราว (ปัจจุบัน)</label><input type="password" style={inp} value={cur} onChange={e => setCur(e.target.value)} autoFocus /></div>
          <div><label style={lbl}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label><input type="password" style={inp} value={next} onChange={e => setNext(e.target.value)} /></div>
          <div><label style={lbl}>ยืนยันรหัสผ่านใหม่</label><input type="password" style={inp} value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
          {confirm && next !== confirm && <p style={err}>รหัสผ่านใหม่ไม่ตรงกัน</p>}
          {next && cur && next === cur && <p style={err}>รหัสผ่านใหม่ต้องต่างจากรหัสชั่วคราว</p>}
          <button onClick={() => mut.mutate()} disabled={!valid || mut.isPending}
            style={{ marginTop: 4, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13.5px', fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed', opacity: valid && !mut.isPending ? 1 : 0.5 }}>
            {mut.isPending ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านและเข้าใช้งาน'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }
const err: React.CSSProperties = { fontSize: '11.5px', color: '#dc2626', margin: 0 }
