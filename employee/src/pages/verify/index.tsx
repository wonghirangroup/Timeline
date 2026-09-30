// employee/src/pages/verify/index.tsx  [MOCK MODE — LIFF stubbed]
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { initLiff, getLiffProfile, getChannelId } from '../../lib/liff'
import { api, setJwt } from '../../lib/axios'
import { PageLoader } from '../../components/ui'
import { PhotoCropModal } from '../../components/ui/PhotoCropModal'
import { uploadCroppedImage } from '../../lib/upload'

interface EmpItem {
  id: string; first_name: string; last_name: string
  nickname: string | null; department: string | null
  employee_code: string; branch: { id: string; name: string }
}

type Step = 'loading' | 'select' | 'confirm' | 'photo' | 'success' | 'error'

const COLORS = [
  '#244B83',
  '#2563EB',
  '#7C3AED',
  '#16A34A',
  '#D97706',
  '#DB2777',
]

export default function VerifyPage({ onLinked }: { onLinked?: () => void } = {}) {
  const navigate  = useNavigate()
  const [step,      setStep]     = useState<Step>('loading')
  const [profile,   setProfile]  = useState<{ lineUserId: string; displayName: string; pictureUrl?: string; idToken: string } | null>(null)
  const [employees, setEmployees] = useState<EmpItem[]>([])
  const [search,    setSearch]   = useState('')
  const [selected,  setSelected] = useState<EmpItem | null>(null)
  const [linking,   setLinking]  = useState(false)
  const [errMsg,    setErrMsg]   = useState('')
  const [empCode,   setEmpCode]  = useState('')
  // ขั้นตอนรูปโปรไฟล์หลังผูกบัญชี — เลือกอัปโหลดเลย หรือไว้ทีหลัง (ไปทำที่หน้าโปรไฟล์)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [photoUrl,     setPhotoUrl]     = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [photoErr,     setPhotoErr]     = useState('')

  const apiUrl    = import.meta.env.VITE_API_URL as string
  const channelId = getChannelId()
  const headers   = { 'ngrok-skip-browser-warning': 'true' }

  useEffect(() => {
    ;(async () => {
      try {
        // ยิงดึงรายชื่อพนักงานพร้อมกับ LIFF init/profile เลย — ไม่ต้องรอ profile
        // ก่อนเพราะ /employee/list ใช้แค่ channelId (รู้ค่าได้ทันทีอยู่แล้ว) ช่วยลด
        // เวลาโหลดหน้าแรกที่ user บ่นว่าช้า (เดิมรอทีละขั้นตอน)
        const employeeListPromise = axios.get(`${apiUrl}/employee/list`, {
          params: { line_channel_id: channelId }, headers,
        })

        await initLiff()
        const p = await getLiffProfile()
        setProfile({ lineUserId: p.lineUserId, displayName: p.displayName, pictureUrl: p.pictureUrl, idToken: p.idToken })

        const res = await employeeListPromise
        setEmployees(res.data.data ?? [])
        setStep('select')
      } catch (e: any) {
        setErrMsg(e?.response?.data?.error?.message ?? e?.message ?? 'เกิดข้อผิดพลาด')
        setStep('error')
      }
    })()
  }, [])

  async function handleLink() {
    if (!selected || !profile || !empCode.trim()) return
    setLinking(true)
    try {
      const res = await axios.post(`${apiUrl}/employee/link`, {
        liff_token:      profile.idToken,
        line_user_id:    profile.lineUserId,
        line_channel_id: channelId,
        employee_id:     selected.id,
        employee_code:   empCode.trim(),
      }, { headers })

      setJwt(res.data.data.token)
      setStep('photo')
    } catch (e: any) {
      const code = e?.response?.data?.error?.code
      if (code === 'ALREADY_LINKED') setErrMsg('พนักงานนี้ผูก Line อื่นไปแล้ว กรุณาติดต่อ HR')
      else if (code === 'INVALID_CODE') setErrMsg('รหัสพนักงานไม่ถูกต้อง กรุณาตรวจสอบกับ HR แล้วลองใหม่')
      else if (code === 'TOO_MANY_ATTEMPTS') setErrMsg(e?.response?.data?.error?.message ?? 'กรอกรหัสผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง')
      else setErrMsg(e?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
      setStep('error')
    } finally { setLinking(false) }
  }

  // จบขั้นตอนผูกบัญชี (อัปโหลดรูปแล้ว หรือกดไว้ทีหลัง) → หน้าสำเร็จ แล้วพาเข้าแอป
  function finishLinking() {
    setStep('success')
    setTimeout(() => {
      if (onLinked) onLinked()
      else navigate('/checkin')
    }, 1500)
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    // เช็ค MIME แบบเดียวกับหน้าโปรไฟล์ — เว็บวิว LINE บางเครื่องส่ง type ว่างมา ปล่อยผ่าน
    if (f.type && !f.type.startsWith('image/')) { setPhotoErr('กรุณาเลือกไฟล์รูปภาพ'); return }
    setPhotoErr('')
    setPendingPhoto(URL.createObjectURL(f))
  }

  async function handleCropConfirm(blob: Blob) {
    const objectUrl = pendingPhoto
    setPendingPhoto(null)
    setUploading(true)
    setPhotoErr('')
    try {
      const url = await uploadCroppedImage(blob)
      await api.patch('/employee/photo', { photo_url: url })
      setPhotoUrl(url)
      setTimeout(finishLinking, 900)
    } catch {
      setPhotoErr('อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง หรือกด "ไว้ทีหลัง"')
    } finally {
      setUploading(false)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }

  function handleCropCancel() {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto)
    setPendingPhoto(null)
  }

  const filtered = employees.filter(e =>
    !search || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.branch.name} ${e.department ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  // ── Loading ──
  if (step === 'loading') return <PageLoader />

  // ── Error ──
  if (step === 'error') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <div style={{ fontWeight: 700, color: 'var(--error)', marginBottom: 16 }}>{errMsg}</div>
      <button onClick={() => { setErrMsg(''); setEmpCode(''); setStep('select') }}
        style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
        ลองใหม่
      </button>
    </div>
  )

  // ── Profile photo (หลังผูกบัญชีสำเร็จ) ──
  if (step === 'photo') return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg-page)', padding: '40px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success, #16A34A)', background: 'rgba(22,163,74,0.1)', padding: '5px 12px', borderRadius: 99 }}>
        ✓ ผูกบัญชีสำเร็จ
      </div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>เพิ่มรูปโปรไฟล์ของคุณ</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
        ช่วยให้หัวหน้าและเพื่อนร่วมงานจำคุณได้ง่ายขึ้น<br />เปลี่ยนภายหลังได้ที่หน้าโปรไฟล์
      </div>

      <button type="button" onClick={() => !uploading && !photoUrl && fileRef.current?.click()} aria-label="เลือกรูปโปรไฟล์"
        style={{ width: 132, height: 132, borderRadius: '50%', marginTop: 28, border: photoUrl ? '3px solid var(--success, #16A34A)' : '2px dashed #cbd5e1', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading || photoUrl ? 'default' : 'pointer', padding: 0 }}>
        {photoUrl
          ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              <div style={{ fontSize: '2.2rem' }}>{uploading ? '⏳' : '📷'}</div>
              {uploading ? 'กำลังอัปโหลด…' : 'แตะเพื่อเลือกรูป'}
            </div>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />

      {photoUrl && <div style={{ marginTop: 14, fontWeight: 700, color: 'var(--success, #16A34A)' }}>บันทึกรูปแล้ว กำลังพาเข้าแอป…</div>}
      {photoErr && <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--error)' }}>{photoErr}</div>}

      {!photoUrl && (
        <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: uploading ? 'rgba(0,0,0,0.08)' : 'var(--accent-primary)', color: uploading ? 'var(--text-muted)' : '#fff', fontSize: '1rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            📷 อัปโหลดรูปเลย
          </button>
          <button onClick={finishLinking} disabled={uploading}
            style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid #e5e7eb', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            ไว้ทีหลัง
          </button>
        </div>
      )}

      {pendingPhoto && <PhotoCropModal imageSrc={pendingPhoto} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />}
    </div>
  )

  // ── Success ──
  if (step === 'success') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '0 24px', textAlign: 'center' }}>
      <div className="animate-success-pop" style={{ fontSize: '5rem' }}>🎉</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>ผูกบัญชีสำเร็จ!</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        ยินดีต้อนรับ คุณ{selected?.first_name} {selected?.last_name}<br />
        กำลังพาไปหน้าเช็คอิน…
      </div>
    </div>
  )

  // ── Confirm ──
  if (step === 'confirm' && selected) {
    const idx = employees.findIndex(e => e.id === selected.id)
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '24px 16px', minHeight: '100dvh', background: 'var(--bg-page)' }}>
        <button onClick={() => { setEmpCode(''); setStep('select') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 28 }}>
          ← เลือกใหม่
        </button>

        <div className="glass-card animate-slide-up" style={{ padding: '28px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: COLORS[idx % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 700, color: '#fff', margin: '0 auto 16px' }}>
            {selected.first_name.charAt(0)}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {selected.first_name} {selected.last_name}
            {selected.nickname && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}> ({selected.nickname})</span>}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {selected.department ?? ''}{selected.department ? ' · ' : ''}{selected.branch.name}
          </div>
        </div>

        {/* Profile ที่จะผูก */}
        {profile && (
          <div className="glass-card animate-slide-up" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile.pictureUrl
              ? <img src={profile.pictureUrl} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
              : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{profile.displayName.charAt(0)}</div>
            }
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>จะผูกกับบัญชี LINE</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{profile.displayName}</div>
            </div>
          </div>
        )}

        {/* กรอกรหัสพนักงานยืนยัน — กันเลือกชื่อคนอื่นจากลิสต์แล้วผูกสวมรอย
            (feedback 2026-09-28: verify เดิมแค่คลิกชื่อ ไม่มีอะไรยืนยันเลย) */}
        <div className="glass-card animate-slide-up" style={{ padding: '16px', marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            กรอกรหัสพนักงานของคุณเพื่อยืนยัน
          </label>
          <input type="text" value={empCode} onChange={e => setEmpCode(e.target.value)}
            placeholder="เช่น 69-01-003"
            style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: '0.95rem', background: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            ไม่ทราบรหัสพนักงาน ติดต่อ HR ของคุณ
          </div>
        </div>

        <button onClick={handleLink} disabled={linking || !empCode.trim()}
          style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', cursor: (linking || !empCode.trim()) ? 'not-allowed' : 'pointer', background: (linking || !empCode.trim()) ? 'rgba(0,0,0,0.08)' : 'var(--accent-primary)', color: (linking || !empCode.trim()) ? 'var(--text-muted)' : '#fff', fontSize: '1.05rem', fontWeight: 700, boxShadow: (linking || !empCode.trim()) ? 'none' : '0 2px 8px rgba(0,0,0,0.1)' }}>
          {linking ? '⏳ กำลังผูกบัญชี…' : '✅ ใช่ นี่คือฉัน — ผูกบัญชี'}
        </button>
      </div>
    )
  }

  // ── Select ──
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg-page)' }}>
      <div className="header-strip animate-fade-in" style={{ padding: '32px 16px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--accent-primary)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>ยินดีต้อนรับ 👋</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          เลือกชื่อของคุณจากรายการด้านล่าง
        </div>
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 10 }}>
            {profile.pictureUrl && <img src={profile.pictureUrl} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} alt="" />}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{profile.displayName}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, ชื่อเล่น, สาขา…"
            style={{ width: '100%', padding: '13px 14px 13px 42px', borderRadius: 14, border: '1px solid #e5e7eb', fontSize: '0.9rem', background: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>ไม่พบชื่อที่ค้นหา</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>ลองค้นหาด้วยคำอื่น หรือแจ้ง HR ให้เพิ่มชื่อ</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((emp, i) => (
              <button key={emp.id}
                onClick={() => { setSelected(emp); setStep('confirm') }}
                className="glass-card animate-slide-up"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 20, cursor: 'pointer', textAlign: 'left', width: '100%', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', animationDelay: `${i * 40}ms` }}
                onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  {emp.first_name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {emp.first_name} {emp.last_name}
                    {emp.nickname && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}> ({emp.nickname})</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {emp.department ?? ''}{emp.department ? ' · ' : ''}{emp.branch.name}
                  </div>
                </div>
                <span style={{ color: 'var(--accent-primary)', fontSize: '1.3rem', opacity: 0.7, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
