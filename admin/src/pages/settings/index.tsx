// admin/src/pages/settings/index.tsx
//
// หมายเหตุ (17 ส.ค. 2569): หน้านี้เคยมีแท็บ "กฎค่าปรับ" ที่เป็น local-state mock
// ล้วนๆ (useState + toast "บันทึกสำเร็จ" ปลอมๆ ไม่มี API ใดๆ) และ calcFine()
// ก็ไม่ถูกเรียกใช้จากที่ไหนในระบบเลย — ของจริงที่ backend ใช้คำนวณค่าปรับสาย
// จริงๆ คือ shift.late_threshold / late_fine_1 / late_fine_2 ต่อกะ
// (ตั้งค่าที่ กะ & เวลา → จัดการกะ) ถูกตัดสินใจแล้วว่าจะ "คงไว้ต่อกะเหมือนเดิม"
// ไม่รวมเป็น setting ระดับ tenant — เลยเอาแท็บ mock นั้นออกไปกันสับสน
//
// (18 ส.ค. 2569) เพิ่มส่วน "ภาพหน้าจอ Loading" ของจริง — Admin อัปโหลด/ลบภาพที่ใช้
// บนหน้าจอ Loading ของแอปพนักงาน (LIFF) ได้เอง ต่อ tenant เก็บไฟล์บน Cloudinary
import { Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import { Clock, MapPin, Image as ImageIcon, UploadCloud, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}

const DEFAULT_MASCOT = '/mascot-cat.jpg'

function LoadingImageSettings() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'loading-image'],
    queryFn:  () => api.get('/api/v1/admin/settings/loading-image').then((r: any) => r.data.data),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/api/v1/admin/settings/loading-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r: any) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'loading-image'] })
      setPreviewUrl(null)
      showToast('success', 'อัปโหลดภาพ Loading สำเร็จ')
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      const msg = code === 'FILE_TOO_LARGE' ? 'ไฟล์มีขนาดใหญ่เกิน 5MB'
        : code === 'INVALID_TYPE' ? 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF'
        : 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง'
      showToast('error', msg)
      setPreviewUrl(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/api/v1/admin/settings/loading-image').then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'loading-image'] })
      showToast('success', 'ลบภาพแล้ว กลับไปใช้ภาพเริ่มต้น')
    },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    uploadMutation.mutate(file)
    e.target.value = '' // เผื่อเลือกไฟล์เดิมซ้ำ ให้ onChange ยิงอีกครั้งได้
  }

  const currentUrl = data?.loading_image_url as string | null | undefined
  const displayUrl = previewUrl ?? currentUrl ?? DEFAULT_MASCOT
  const isCustom = !!currentUrl
  const busy = uploadMutation.isPending || deleteMutation.isPending

  return (
    <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', flexShrink: 0 }}>
          <ImageIcon size={18} />
        </div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>ภาพหน้าจอ Loading (แอปพนักงาน)</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            ภาพที่แสดงบนหน้าจอ Loading ตอนพนักงานเปิดแอปผ่าน Line — ถ้าไม่กำหนดจะใช้ภาพเริ่มต้นของระบบ
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '2px solid #f1f5f9', background: '#f9fafb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isLoading ? 0.5 : 1,
        }}>
          <img src={displayUrl} alt="ภาพ Loading ปัจจุบัน" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFilePick} style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: busy ? 'default' : 'pointer',
                background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <UploadCloud size={15} />
              {uploadMutation.isPending ? 'กำลังอัปโหลด…' : isCustom ? 'เปลี่ยนภาพ' : 'อัปโหลดภาพ'}
            </button>
            {isCustom && (
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={busy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca', cursor: busy ? 'default' : 'pointer',
                  background: '#fff', color: '#dc2626', fontSize: '13px', fontWeight: 600,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Trash2 size={15} />
                {deleteMutation.isPending ? 'กำลังลบ…' : 'ลบ กลับไปใช้ค่าเริ่มต้น'}
              </button>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>รองรับ JPG, PNG, WEBP, GIF ขนาดไม่เกิน 5MB</p>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>การตั้งค่า</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
          การตั้งค่าที่เกี่ยวกับเวลาเข้างาน (ค่าปรับสาย, รัศมี GPS) กำหนดแยกทีละกะเพื่อรองรับแต่ละสาขา/กะที่กฎไม่เหมือนกัน
        </p>
      </div>

      <LoadingImageSettings />

      <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
            <Clock size={18} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>เกณฑ์การสาย & ค่าปรับ</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              ตั้งค่าแยกทีละกะ — ไปที่ <strong>กะ & เวลา → จัดการกะ</strong> เลือกกะที่ต้องการ แล้วดูส่วน "เกณฑ์การสาย & ค่าปรับ"
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
            <MapPin size={18} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>รัศมีเช็คอิน GPS</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              ตั้งค่าแยกทีละกะเช่นกัน — ไปที่ <strong>กะ & เวลา → จัดการกะ</strong>
            </p>
          </div>
        </div>
        <Link to="/shift" style={{
          alignSelf: 'flex-start', marginTop: 4, padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
          background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600,
        }}>
          ไปที่จัดการกะ →
        </Link>
      </div>
    </div>
  )
}
