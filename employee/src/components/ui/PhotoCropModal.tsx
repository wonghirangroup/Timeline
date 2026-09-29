// employee/src/components/ui/PhotoCropModal.tsx
// ปรับขนาด/เลื่อนตำแหน่งรูปโปรไฟล์ก่อนอัปโหลดจริง (feedback 2026-09-29
// "ปรับขนาดที่ต้องการให้แสดงเป็นหน้าโปรไฟล์ได้") — เดิมอัปโหลดตรงแล้วให้
// Cloudinary auto-crop ด้วย face-detection (g_face) ผู้ใช้เลือกกรอบเองไม่ได้
// เต็มจอแบบ portal เหมือน BottomSheet (กัน ancestor transform ทำตำแหน่งเพี้ยน)
// ไม่ใช้ BottomSheet ตรงๆ เพราะ cropper ต้องใช้ touch gesture ของตัวเอง (ลาก/
// pinch zoom) ชนกับ drag-to-close ของ BottomSheet
import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Check, X, ZoomIn } from 'lucide-react'
import { getCroppedImageBlob } from '../../lib/cropImage'

interface PhotoCropModalProps {
  imageSrc: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export function PhotoCropModal({ imageSrc, onCancel, onConfirm }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels || saving) return
    setSaving(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } catch {
      setSaving(false)
    }
  }

  return createPortal(
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div style={{ background: '#111', padding: '18px 20px calc(20px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ZoomIn size={18} color="rgba(255,255,255,0.7)" />
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#244B83' }}
            aria-label="ซูม"
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            <X size={16} /> ยกเลิก
          </button>
          <button onClick={handleConfirm} disabled={saving || !croppedAreaPixels}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            <Check size={16} /> {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
