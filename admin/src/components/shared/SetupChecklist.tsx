// admin/src/components/shared/SetupChecklist.tsx
// รายการตั้งค่าเริ่มต้น — โผล่บน Dashboard ตอน tenant ยังตั้งค่าไม่ครบ
// พาไปถึง "aha moment": พนักงานสแกน QR สาขาแล้วเช็คอินเข้ามาให้เห็นบน Dashboard
// หายเองเมื่อครบ 3 ข้อหลัก (สาขา/พนักงาน/กะ) หรือกดปิดถาวร
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, X, Rocket } from 'lucide-react'
import { api } from '../../lib/axios'

const DISMISS_KEY = 'tl_setup_checklist_dismissed'

interface Step { key: string; label: string; hint: string; done: boolean; path: string }

export default function SetupChecklist() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  const { data: branches = [] }  = useQuery<any[]>({ queryKey: ['admin', 'branches'],  queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data) })
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ['admin', 'employees'], queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data) })
  const { data: shifts = [] }    = useQuery<any[]>({ queryKey: ['shifts'],             queryFn: () => api.get('/api/v1/admin/shifts').then(r => r.data.data) })

  const steps: Step[] = [
    { key: 'branch',   label: 'เพิ่มสาขา',          hint: 'สาขาแรกของบริษัท — ที่ตั้ง + รัศมีเช็คอิน',   done: branches.length > 0,  path: '/branch' },
    { key: 'employee', label: 'เพิ่มพนักงาน',       hint: 'นำเข้าทีละคนหรือหลายคนพร้อมกัน',            done: employees.length > 0, path: '/employee' },
    { key: 'shift',    label: 'ตั้งกะการทำงาน',     hint: 'เวลาเข้า-ออกงาน + เกณฑ์สาย/ขาด',            done: shifts.length > 0,    path: '/shift' },
    { key: 'qr',       label: 'แชร์ QR สาขาให้พนักงาน', hint: 'พนักงานสแกนผ่าน LINE เพื่อเช็คอิน — จบขั้นตอน', done: false,                path: '/shift' },
  ]

  const coreDone = steps.slice(0, 3).every(s => s.done)
  const doneCount = steps.filter(s => s.done).length
  if (dismissed || coreDone) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="premium-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--accent-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--accent-light)', borderBottom: '1px solid #fde3c7' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
          <Rocket size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#7c2d12' }}>เริ่มต้นใช้งาน TimeLine</div>
          <div style={{ fontSize: '11.5px', color: '#9a3412' }}>ทำ {doneCount}/{steps.length} ข้อ — อีกไม่กี่ขั้นตอนพนักงานก็เช็คอินได้</div>
        </div>
        <button onClick={dismiss} aria-label="ปิดรายการนี้"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', display: 'flex', padding: 4, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>
      <div>
        {steps.map((s, i) => (
          <button key={s.key} onClick={() => navigate(s.path)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
              border: 'none', borderBottom: i < steps.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done ? 'var(--success)' : '#f1f5f9',
              border: s.done ? 'none' : '1.5px solid #cbd5e1',
            }}>
              {s.done && <Check size={13} color="#fff" strokeWidth={3} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: s.done ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
              <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 1 }}>{s.hint}</span>
            </span>
            {!s.done && <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}
