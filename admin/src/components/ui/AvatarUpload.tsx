import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { uploadImage, cloudinaryEnabled, avatarUrl } from '../../lib/upload'
import { useToast } from './Toast'

interface Props {
  value?: string | null
  fallback?: string            // อักษรย่อ ถ้าไม่มีรูป
  size?: number
  disabled?: boolean
  onChange: (url: string | null) => void   // ส่ง null = ลบรูป
}

export default function AvatarUpload({ value, fallback, size = 88, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('error', 'ต้องเป็นไฟล์รูปภาพ'); return }
    setBusy(true)
    try {
      const url = await uploadImage(file)
      onChange(url)
      showToast('success', 'อัปโหลดรูปแล้ว')
    } catch {
      showToast('error', 'อัปโหลดไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{
          width: size, height: size, borderRadius: '50%', overflow: 'hidden',
          background: value ? '#e2e8f0' : 'linear-gradient(135deg,#f97316,#ea580c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: size * 0.34, fontWeight: 800, border: '3px solid #fff', boxShadow: 'var(--shadow-md)',
        }}>
          {value
            ? <img src={avatarUrl(value, Math.round(size * 2)) ?? value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (fallback ?? '?')}
        </div>

        {!disabled && (
          <button type="button" onClick={() => (cloudinaryEnabled ? inputRef.current?.click() : undefined)}
            disabled={busy}
            title={cloudinaryEnabled ? 'เปลี่ยนรูป' : 'ยังไม่ได้ตั้งค่า Cloudinary — ใช้ช่องวาง URL ด้านล่าง'}
            style={{
              position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: '50%',
              border: '2px solid #fff', background: 'var(--action-primary)', color: '#fff', cursor: busy ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)',
            }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          </button>
        )}

        {!disabled && value && !busy && (
          <button type="button" onClick={() => onChange(null)} title="ลบรูป"
            style={{
              position: 'absolute', left: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%',
              border: '2px solid #fff', background: '#dc2626', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <X size={13} />
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={pick} hidden />

      {!disabled && !cloudinaryEnabled && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)} placeholder="วาง URL รูป https://..."
            style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.72rem', width: 180 }} />
          <button type="button" onClick={() => { if (/^https:\/\/\S+/.test(urlDraft)) { onChange(urlDraft.trim()); setUrlDraft('') } else showToast('error', 'URL ไม่ถูกต้อง') }}
            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'var(--action-primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>ใช้</button>
        </div>
      )}
    </div>
  )
}
