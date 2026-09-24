// employee/src/pages/profile/index.tsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IdCard, Building2, Clock, MessageCircle, Wrench, AlertTriangle, DoorOpen, ExternalLink, Camera, CalendarDays, FileText } from 'lucide-react'
import { PageLoader } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/axios'
import { uploadImage, cloudinaryEnabled, avatarUrl } from '../../lib/upload'

export default function ProfilePage() {
  const navigate = useNavigate()
  const employee = useAuthStore(s => s.employee)
  const patchEmployee = useAuthStore(s => s.patchEmployee)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [switchingToAdmin, setSwitchingToAdmin] = useState(false)

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // เดิมเช็ค file.type.startsWith('image/') แล้ว return เงียบๆ ถ้าไม่ตรง — เว็บวิว
    // LINE บางเครื่อง/บางรุ่น (โดยเฉพาะรูปที่ถ่ายจากกล้องตรงๆ ไม่ได้เลือกจากคลัง) รายงาน
    // file.type เป็นค่าว่างหรือไม่ตรงกับที่คาด ทำให้เงียบไปเลย กดแล้วไม่มีอะไรเกิดขึ้น
    // เหมือนปุ่มพัง (feedback 2026-09-14: "อัปโหลดรูปโปรไฟล์ใน Line ไม่ได้") — input
    // accept="image/*" กรองที่ตัวเลือกไฟล์ของ OS อยู่แล้ว เช็ค MIME ซ้ำแค่กันไฟล์ที่
    // ระบุ type ชัดเจนว่าไม่ใช่รูปจริงๆ (เช่น .pdf) ปล่อยผ่านกรณี type ว่าง/ไม่ทราบ
    if (file.type && !file.type.startsWith('image/')) { alert('กรุณาเลือกไฟล์รูปภาพ'); return }
    setUploading(true)
    try {
      const url = await uploadImage(file)
      await api.patch('/employee/photo', { photo_url: url })
      patchEmployee({ photo_url: url })
    } catch {
      alert('อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  const showSwitchToAdmin = !!employee?.admin_access

  // เดิม employee.admin_url เป็นลิงก์เปล่าพาไปหน้า login เฉยๆ (ต้องล็อกอินซ้ำ) — feedback
  // 2026-09-15 "อยาก login อัตโนมัติเลย" เปลี่ยนเป็นขอ token auto-login สดตอนกดปุ่มแทน
  // (token หมดอายุเร็วมาก ฝังไว้ล่วงหน้าใน /employee/me จะหมดอายุก่อนกดจริง)
  async function handleSwitchToAdmin() {
    if (switchingToAdmin) return
    setSwitchingToAdmin(true)
    try {
      const res = await api.post('/employee/switch-to-admin')
      window.open(res.data.data.url, '_blank', 'noopener')
    } catch {
      alert('เปิดเว็บแอดมินไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSwitchingToAdmin(false)
    }
  }

  const MENU_ITEMS = [
    { Icon: Clock,          label: 'รายการ OT',       sub: 'ประวัติทำงานล่วงเวลา', bubbleClass: 'icon-bubble-blue',   path: '/ot',       show: true },
    { Icon: FileText,       label: 'ขอเอกสาร HR',    sub: 'สลิปเงินเดือน / หนังสือรับรอง', bubbleClass: 'icon-bubble-teal', path: '/documents', show: !!employee && employee.feat_document_request !== false },
    { Icon: AlertTriangle,  label: 'หนังสือเตือน',   sub: 'ดู + กดรับทราบ',       bubbleClass: 'icon-bubble-orange', path: '/notices',  show: !!employee && employee.feat_disciplinary !== false },
    { Icon: MessageCircle,  label: 'ส่งความคิดเห็น', sub: 'ไม่ระบุตัวตน',         bubbleClass: 'icon-bubble-purple', path: '/feedback', show: true },
    { Icon: DoorOpen,       label: 'ยื่นลาออก',      sub: 'ผู้ดูแลจะตรวจสอบ',      bubbleClass: 'icon-bubble-orange', path: '/resign',   show: !!employee && employee.feat_resignation !== false },
  ].filter(m => m.show)

  if (!employee) return <PageLoader />

  const fullName = `${employee.first_name} ${employee.last_name}`
  const STATUS_CFG: Record<string, { label: string; dot: string }> = {
    ACTIVE:     { label: 'พนักงานประจำ', dot: '#4ADE80' },
    INACTIVE:   { label: 'ไม่ได้ปฏิบัติงาน', dot: '#9CA3AF' },
    RESIGNED:   { label: 'ลาออกแล้ว',    dot: '#EC6F44' },
    TERMINATED: { label: 'เลิกจ้าง',     dot: '#EF4444' },
  }
  const statusInfo = STATUS_CFG[employee.status ?? 'ACTIVE'] ?? STATUS_CFG.ACTIVE
  const hiredAtLabel = employee.hired_at
    ? new Date(employee.hired_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header" style={{ paddingBottom: 64, paddingTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              {employee.photo_url
                ? <img src={avatarUrl(employee.photo_url, 160) ?? employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : employee.first_name.charAt(0)}
            </div>
            {cloudinaryEnabled && (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: '50%', border: '2px solid #fff', background: '#EC6F44', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                aria-label="เปลี่ยนรูปโปรไฟล์">
                <Camera size={14} />
              </button>
            )}
            {uploading && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>...</div>}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} hidden />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{fullName}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{employee.nickname || employee.branch.name}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '5px 14px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusInfo.dot, display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{statusInfo.label}</span>
          </div>
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* ── Work Info ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>ข้อมูลการทำงาน</div>
          {[
            { label: 'รหัสพนักงาน', value: employee.employee_code, Icon: IdCard },
            {
              label: 'สาขา', Icon: Building2,
              value: employee.extra_branches && employee.extra_branches.length > 0
                ? `${employee.branch.name} + ${employee.extra_branches.map(b => b.name).join(', ')}`
                : employee.branch.name,
            },
            ...(hiredAtLabel ? [{ label: 'วันที่เข้าทำงาน', value: hiredAtLabel, Icon: CalendarDays }] : []),
          ].map(row => (
            <div key={row.label} className="fw-row">
              <row.Icon size={17} color="#6B7D90" style={{ width: 22, flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#6B7D90', flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A2B3C', textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── Menu ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>เมนูอื่นๆ</div>
          {MENU_ITEMS.map(({ Icon, label, sub, bubbleClass, path }) => (
            <div key={path} className="fw-row" style={{ cursor: 'pointer' }} onClick={() => navigate(path)}>
              <div className={`icon-bubble ${bubbleClass}`} style={{ borderRadius: 14 }}><Icon size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1A2B3C' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: '#6C89F5', marginTop: 2 }}>{sub}</div>
              </div>
              <span style={{ color: '#D1D5DB', fontSize: '1.1rem' }}>›</span>
            </div>
          ))}
        </div>

        {showSwitchToAdmin && (
          <button
            onClick={handleSwitchToAdmin}
            disabled={switchingToAdmin}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 14, padding: '13px 14px', cursor: switchingToAdmin ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 24, opacity: switchingToAdmin ? 0.7 : 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#4F46E5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ExternalLink size={19} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#312E81' }}>{switchingToAdmin ? 'กำลังเปิด...' : 'สลับไปเว็บแอดมิน'}</div>
              <div style={{ fontSize: '0.75rem', color: '#6366F1', marginTop: 2 }}>เปิดหน้าจัดการสำหรับแอดมิน</div>
            </div>
            <span style={{ color: '#A5B4FC', fontSize: '1.1rem' }}>›</span>
          </button>
        )}

        <div style={{ textAlign: 'center', paddingTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {import.meta.env.DEV && (
            <button onClick={() => { localStorage.removeItem('dev_employee_id'); window.location.reload() }}
              style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Wrench size={13} /> DEV: เปลี่ยนพนักงาน
            </button>
          )}
          <button onClick={() => navigate('/verify')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#6B7280', textDecoration: 'underline', fontFamily: 'inherit' }}>
            เปลี่ยนบัญชี LINE
          </button>
        </div>
      </div>
    </div>
  )
}
