// อัปโหลดรูปผ่าน Cloudinary (unsigned upload preset) — ตั้งค่าที่ ENV:
//   VITE_CLOUDINARY_CLOUD_NAME   เช่น "timeline-hr"
//   VITE_CLOUDINARY_UPLOAD_PRESET  ชื่อ unsigned preset
// ถ้าไม่ได้ตั้ง → cloudinaryEnabled = false, ฝั่ง UI จะ fallback เป็นช่องวาง URL แทน
const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export const cloudinaryEnabled = !!(CLOUD && PRESET)

// ย่อรูปฝั่ง client ก่อนอัปโหลด — ประหยัดโควตา Cloudinary + เร็วขึ้น
export async function resizeImage(file: File, maxDim = 640, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', quality)
  })
}

export async function uploadImage(file: File): Promise<string> {
  if (!cloudinaryEnabled) throw new Error('CLOUDINARY_NOT_CONFIGURED')
  const blob = await resizeImage(file).catch(() => file) // ย่อไม่ได้ก็ส่งไฟล์เดิม
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('upload_preset', PRESET!)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('UPLOAD_FAILED')
  const json = await res.json()
  return json.secure_url as string
}
