// employee/src/pages/profile/index.tsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IdCard, Building2, Clock, MessageCircle, Wrench, AlertTriangle, DoorOpen, ExternalLink, Camera, CalendarDays, FileText } from 'lucide-react'
import { PageLoader } from '../../components/ui'
import { PhotoCropModal } from '../../components/ui/PhotoCropModal'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/axios'
import { uploadCroppedImage, cloudinaryEnabled, avatarUrl } from '../../lib/upload'
import { GuideCarousel } from '../../components/ui/GuideCarousel'

export default function ProfilePage() {
  const navigate = useNavigate()
  const employee = useAuthStore(s => s.employee)
  const patchEmployee = useAuthStore(s => s.patchEmployee)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [switchingToAdmin, setSwitchingToAdmin] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  // รูปที่เพิ่งเลือกแต่ยังไม่ครอป — เปิด PhotoCropModal ให้ปรับกรอบเองก่อน
  // อัปโหลดจริง (feedback 2026-09-29 "ปรับขนาดที่ต้องการให้แสดงเป็นหน้าโปรไฟล์ได้"
  // — เดิมอัปโหลดตรงแล้วให้ Cloudinary auto-crop ด้วย face-detection เลือกกรอบเองไม่ได้)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
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
    setPendingPhoto(URL.createObjectURL(file))
  }

  async function handleCropConfirm(blob: Blob) {
    const objectUrl = pendingPhoto
    setPendingPhoto(null)
    setUploading(true)
    try {
      const url = await uploadCroppedImage(blob)
      await api.patch('/employee/photo', { photo_url: url })
      patchEmployee({ photo_url: url })
    } catch {
      alert('อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }

  function handleCropCancel() {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto)
    setPendingPhoto(null)
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
    RESIGNED:   { label: 'ลาออกแล้ว',    dot: '#244B83' },
    TERMINATED: { label: 'เลิกจ้าง',     dot: '#EF4444' },
  }
  const statusInfo = STATUS_CFG[employee.status ?? 'ACTIVE'] ?? STATUS_CFG.ACTIVE
  const hiredAtLabel = employee.hired_at
    ? new Date(employee.hired_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="page-container px-page" style={{ maxWidth: 430, margin: '0 auto', background: '#F3F8FF' }}>
      <style>{`
        @keyframes px-owl { 0%, 100% { transform: translateY(0) rotate(0) } 50% { transform: translateY(-5px) rotate(2deg) } }
        .px-row { transition: transform .12s, box-shadow .12s }
        .px-row:active { transform: scale(.985) }
        @media (prefers-reduced-motion: reduce) { .px-owl { animation: none !important } }
      `}</style>

      {/* ── แบนเนอร์โปรไฟล์ (คลื่นฟ้า + นกฮูกโบกมือ) ─────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, #4FA3FF 0%, #2F86F2 55%, #1F6FE0 100%)', padding: '34px 20px 74px', borderRadius: '0 0 34px 34px' }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: -60, bottom: -50, width: 240, height: 130, borderRadius: '50%', background: 'rgba(120,185,255,0.45)' }} />
        <span aria-hidden="true" style={{ position: 'absolute', right: -80, bottom: -70, width: 330, height: 150, borderRadius: '50%', background: 'rgba(80,150,250,0.55)' }} />
        <span aria-hidden="true" style={{ position: 'absolute', right: -50, top: -60, width: 170, height: 110, borderRadius: '50%', background: 'rgba(150,200,255,0.35)' }} />
        <span aria-hidden="true" style={{ position: 'absolute', left: -40, top: -70, width: 240, height: 120, borderRadius: '50%', background: 'rgba(150,200,255,0.30)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: 22, top: 44, color: '#fff', fontFamily: "'Segoe Script','Bradley Hand','Comic Sans MS',cursive", fontSize: '1.35rem', lineHeight: 1.15, transform: 'rotate(-8deg)', opacity: 0.95 }}>
          YooNai<br />Employee<br /><span style={{ fontSize: '1.1rem' }}>♡</span>
        </div>
        <img src="/checkin/owl-wave.webp" alt="" aria-hidden="true" draggable={false} className="px-owl"
          style={{ position: 'absolute', right: -18, top: 6, width: 132, height: 132, objectFit: 'contain', animation: 'px-owl 4s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 104, height: 104 }}>
            <div style={{ width: 104, height: 104, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.25)', border: '4px solid #fff', boxShadow: '0 8px 22px rgba(0,50,140,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
              {employee.photo_url
                ? <img src={avatarUrl(employee.photo_url, 220) ?? employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : employee.first_name.charAt(0)}
            </div>
            {cloudinaryEnabled && (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ position: 'absolute', right: -4, bottom: 0, width: 38, height: 38, borderRadius: '50%', border: '3px solid #fff', background: '#1E4FA8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                aria-label="เปลี่ยนรูปโปรไฟล์">
                <Camera size={17} />
              </button>
            )}
            {uploading && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem' }}>กำลังอัปโหลด…</div>}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} hidden />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.45rem', color: '#fff', textShadow: '0 2px 8px rgba(0,40,120,0.25)' }}>{fullName}</div>
            <div style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.88)', marginTop: 2 }}>{employee.nickname || employee.branch.name}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.24)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 99, padding: '8px 20px' }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: statusInfo.dot, display: 'inline-block', boxShadow: '0 0 8px ' + statusInfo.dot }} />
            <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 700 }}>{statusInfo.label}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 14px 120px', marginTop: -44, position: 'relative', zIndex: 3 }}>

        {/* ── ข้อมูลการทำงาน ───────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 28, padding: '20px 18px 8px', boxShadow: '0 8px 28px rgba(36,75,131,0.12)', border: '1.5px solid #E3ECF8', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0B1B4D', marginBottom: 10 }}>ข้อมูลการทำงาน</div>
          {[
            { label: 'รหัสพนักงาน', value: employee.employee_code, Icon: IdCard },
            {
              label: 'สาขา', Icon: Building2,
              value: employee.extra_branches && employee.extra_branches.length > 0
                ? `${employee.branch.name} + ${employee.extra_branches.map(b => b.name).join(', ')}`
                : employee.branch.name,
            },
            ...(hiredAtLabel ? [{ label: 'วันที่เข้าทำงาน', value: hiredAtLabel, Icon: CalendarDays }] : []),
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < arr.length - 1 ? '1.5px solid #E8F0FC' : 'none' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#EAF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <row.Icon size={26} color="#1D4ED8" strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '1rem', color: '#5B6B8C', flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1B4D', textAlign: 'right', maxWidth: '55%' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── เมนูอื่นๆ ────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0B1B4D', margin: '0 4px 12px' }}>เมนูอื่นๆ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MENU_ITEMS.map(({ Icon, label, sub, bubbleClass, path }) => {
              const tone = ({ 'icon-bubble-blue': ['#E1EEFF', '#1D6FE0'], 'icon-bubble-teal': ['#CFF7E6', '#0F8F63'], 'icon-bubble-orange': ['#E3EAF5', '#10285E'], 'icon-bubble-purple': ['#EDE6FF', '#6D3FD8'] } as Record<string, [string, string]>)[bubbleClass] ?? ['#E1EEFF', '#1D6FE0']
              return (
                <div key={path} className="px-row" role="button" tabIndex={0} onClick={() => navigate(path)} onKeyDown={e => { if (e.key === 'Enter') navigate(path) }}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 24, background: '#fff', border: '1.5px solid #E3ECF8', boxShadow: '0 6px 20px rgba(36,75,131,0.08)' }}>
                  <div style={{ width: 62, height: 62, borderRadius: 18, background: tone[0], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={30} color={tone[1]} strokeWidth={2.1} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0B1B4D' }}>{label}</div>
                    <div style={{ fontSize: '0.95rem', color: '#3B82F6', marginTop: 3 }}>{sub}</div>
                  </div>
                  <span style={{ color: '#B8C2D6', fontSize: '1.8rem', lineHeight: 1 }}>›</span>
                </div>
              )
            })}
          </div>
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

        <button onClick={() => setShowGuide(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '13px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#244B83', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>📖</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1A2B3C' }}>คู่มือการใช้งาน</div>
            <div style={{ fontSize: '0.75rem', color: '#6C89F5', marginTop: 2 }}>วิธีผูกบัญชีและเริ่มเช็คอิน 6 ขั้นตอน</div>
          </div>
          <span style={{ color: '#D1D5DB', fontSize: '1.1rem' }}>›</span>
        </button>
        {showGuide && <GuideCarousel onClose={() => setShowGuide(false)} />}

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

      {pendingPhoto && (
        <PhotoCropModal imageSrc={pendingPhoto} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
    </div>
  )
}
