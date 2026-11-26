// admin/src/components/shared/SetupChecklist.tsx
// รายการตั้งค่าเริ่มต้น — โผล่บน Dashboard ตอน tenant ยังตั้งค่าไม่ครบ
// บอกเป็นลำดับว่าแอดมินใหม่ต้องทำอะไรก่อน-หลัง (บริษัททั่วไปทำตามนี้ก็ใช้งานได้ ไม่ต้องรู้กติกาละเอียดทั้งหมด)
// 3 ช่วง: โครงบริษัท → วันหยุดและการลา → คนและ LINE · ข้อที่ติด "จำเป็น" ต้องครบก่อนพนักงานใช้งานได้จริง
// ข้อ "แนะนำ" ข้ามได้ — ระบบมีค่าเริ่มต้นให้ (เช่น ทุกคนจองวันหยุดได้ ลาได้ ปรับเงินตามกะ) แก้ทีหลังได้ที่รายงานนโยบาย
// หายเองเมื่อทำครบทุกข้อ หรือกดปิด (จำแยกตามบริษัทในเบราว์เซอร์นี้)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, X, Rocket } from 'lucide-react'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'
import { useFeatureEnabled } from '../../hooks/useFeatureEnabled'

interface Step { key: string; label: string; hint: string; done: boolean; path: string; required: boolean }
interface Phase { title: string; steps: Step[] }

export default function SetupChecklist() {
  const navigate = useNavigate()
  const tenantId = useAuthStore(s => s.tenantId)
  const leaveOn = useFeatureEnabled('leave_management')
  const dismissKey = `tl_setup_checklist_dismissed_${tenantId ?? ''}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === '1' } catch { return false }
  })

  const year = new Date().getFullYear()
  const { data: branches = [] }  = useQuery<any[]>({ queryKey: ['admin', 'branches'],  queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data) })
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ['admin', 'employees'], queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data) })
  const { data: shifts = [] }    = useQuery<any[]>({ queryKey: ['shifts'],             queryFn: () => api.get('/api/v1/admin/shifts').then(r => r.data.data) })
  const { data: statusTypes = [] } = useQuery<any[]>({ queryKey: ['employee-status-types'], queryFn: () => api.get('/api/v1/admin/employee-status-types').then(r => r.data.data) })
  const { data: holidays = [] }  = useQuery<any[]>({
    queryKey: ['setup-holidays', year], enabled: leaveOn,
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year } }).then(r => r.data.data ?? []),
  })

  const phases: Phase[] = [
    { title: '1. วางโครงบริษัท', steps: [
      { key: 'branch', required: true,  label: 'เพิ่มสาขา', hint: 'ชื่อสาขา ที่ตั้ง และรัศมีที่เช็คอินได้', done: branches.length > 0, path: '/branch' },
      { key: 'shift',  required: true,  label: 'ตั้งเวลาเข้า-ออกงาน (กะ)', hint: 'ที่หน้าสาขา แท็บ "จัดการกะ" — เวลาเริ่ม-เลิกงาน และเกณฑ์สาย/ขาด ถ้าทุกคนเข้าเวลาเดียวกัน สร้างกะเดียวพอ', done: shifts.length > 0, path: '/branch' },
      { key: 'status', required: false, label: 'กำหนดประเภทพนักงาน', hint: 'เช่น พนักงานประจำ / รายวัน — ใส่จำนวนวันหยุดต่อเดือน และเสาร์-อาทิตย์ทำงานไหม (ข้ามได้ถ้าไม่ใช้จองวันหยุด)', done: statusTypes.length > 0, path: '/employee?tab=status' },
    ] },
    ...(leaveOn ? [{ title: '2. วันหยุดและการลา', steps: [
      { key: 'holiday', required: false, label: 'ใส่วันหยุดนักขัตฤกษ์ของปี', hint: 'วันหยุดประจำปีของบริษัท ระบบจะไม่นับเป็นวันขาด', done: holidays.length > 0, path: '/leave?tab=holiday' },
    ] }] : []),
    { title: leaveOn ? '3. เพิ่มคนและให้เริ่มใช้งาน' : '2. เพิ่มคนและให้เริ่มใช้งาน', steps: [
      { key: 'employee', required: true, label: 'เพิ่มพนักงาน', hint: 'ทีละคน หรือนำเข้าหลายคนพร้อมกัน — เลือกสาขาและประเภทพนักงานให้ถูกตั้งแต่ตอนเพิ่ม', done: employees.length > 0, path: '/employee' },
      { key: 'line',     required: true, label: 'ให้พนักงานผูก LINE', hint: 'พนักงานเปิดแอปจาก LINE ครั้งแรก แล้วกรอกรหัสพนักงานเพื่อยืนยัน จากนั้นสแกน QR ที่สาขาเพื่อเช็คอิน', done: employees.some(e => !!e.line_user_id), path: '/employee' },
    ] },
  ]

  const all = phases.flatMap(p => p.steps)
  const requiredLeft = all.filter(s => s.required && !s.done).length
  const doneCount = all.filter(s => s.done).length
  if (dismissed || doneCount === all.length) return null

  function dismiss() {
    try { localStorage.setItem(dismissKey, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  // ข้อถัดไปที่ควรทำ = ข้อจำเป็นแรกที่ยังไม่เสร็จ (ถ้าจำเป็นครบแล้ว = ข้อแนะนำแรกที่เหลือ)
  const next = all.find(s => s.required && !s.done) ?? all.find(s => !s.done)

  return (
    <div className="premium-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--accent-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--accent-light)', borderBottom: '1px solid #fde3c7' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
          <Rocket size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#7c2d12' }}>เริ่มต้นใช้งาน TimeLine</div>
          <div style={{ fontSize: '11.5px', color: '#9a3412' }}>
            ทำแล้ว {doneCount}/{all.length} ข้อ · {requiredLeft > 0 ? `เหลือข้อจำเป็น ${requiredLeft} ข้อ ก่อนพนักงานเช็คอินได้` : 'ข้อจำเป็นครบแล้ว — ที่เหลือเป็นข้อแนะนำ'}
          </div>
          <div style={{ height: 5, borderRadius: 99, background: '#fff', marginTop: 7, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((doneCount / all.length) * 100)}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width .3s' }} />
          </div>
        </div>
        <button onClick={dismiss} aria-label="ปิดรายการนี้"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', display: 'flex', padding: 4, flexShrink: 0, alignSelf: 'flex-start' }}>
          <X size={16} />
        </button>
      </div>
      <div>
        {phases.map(ph => (
          <div key={ph.title}>
            <div style={{ padding: '9px 18px 5px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-card)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>{ph.title}</div>
            {ph.steps.map(s => {
              const isNext = next?.key === s.key
              return (
                <button key={s.key} onClick={() => navigate(s.path)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
                    border: 'none', borderTop: '1px solid rgba(0,0,0,0.04)',
                    background: isNext ? '#fffbeb' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: s.done ? 'var(--success)' : '#E6ECF4',
                    border: s.done ? 'none' : '1.5px solid #cbd5e1',
                  }}>
                    {s.done && <Check size={13} color="#fff" strokeWidth={3} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '13px', fontWeight: 700, color: s.done ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: s.done ? 'line-through' : 'none' }}>
                      {s.label}
                      {!s.done && (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, textDecoration: 'none', padding: '1px 7px', borderRadius: 99, color: s.required ? '#b91c1c' : '#64748b', background: s.required ? '#fee2e2' : '#f1f5f9' }}>
                          {s.required ? 'จำเป็น' : 'แนะนำ'}
                        </span>
                      )}
                      {isNext && <span style={{ fontSize: '10.5px', fontWeight: 700, textDecoration: 'none', padding: '1px 7px', borderRadius: 99, color: '#92400e', background: '#fde68a' }}>ทำข้อนี้ต่อ</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 1 }}>{s.hint}</span>
                  </span>
                  {!s.done && <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
