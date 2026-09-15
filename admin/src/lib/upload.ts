// อัปโหลดรูปผ่าน Cloudinary (unsigned upload preset)
// ใช้บัญชีเดียวกับ linecommerce-pro (C:\Users\User\Desktop\linecommerce-pro\src\services\uploadService.ts)
const CLOUD_NAME    = 'dffqpiizc'
const UPLOAD_PRESET = 'my_shop_preset'
const FOLDER        = 'timeline/employees'

export const cloudinaryEnabled = true

// ย่อรูปฝั่ง client ก่อนอัปโหลด — ประหยัดโควตา + เร็วขึ้น
export async function resizeImage(file: File, maxDim = 640, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', quality)
  })
}

export async function uploadImage(file: File): Promise<string> {
  const blob = await resizeImage(file).catch(() => file) // ย่อไม่ได้ก็ส่งไฟล์เดิม
  const fd = new FormData()
  // ต้องตั้งชื่อไฟล์เองตอน append — resizeImage คืน Blob เปล่าๆ ไม่มี .name
  // ถ้าไม่ใส่ browser จะส่งชื่อ multipart เป็น "blob" ตายตัวเสมอ ทำให้ Cloudinary
  // มองว่าทุกการอัปโหลด (ไม่ว่าใคร ไม่ว่าไฟล์ไหน) เป็น public_id เดียวกัน
  // "timeline/employees/blob" ชนกันหมด — คนที่อัปโหลดคนแรกเลย "ชนะ" ตลอดไป คนหลังๆ
  // อัปโหลดสำเร็จ (200, ได้ URL กลับมา) แต่เนื้อหารูปไม่เคยเปลี่ยนเป็นของตัวเองเลย
  // (feedback 2026-09-15: "เปลี่ยนรูปโปรไฟล์แล้วกลับไปเป็นรูปแรกที่แอดมินตั้งให้")
  fd.append('file', blob, `photo_${Date.now()}.jpg`)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', FOLDER)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('UPLOAD_FAILED')
  const json = await res.json()
  return json.secure_url as string
}

// อัปโหลดไฟล์ใดๆ (PDF / รูป / เอกสาร) — ไม่ย่อ, ใช้ resource_type auto
export async function uploadFile(file: File, folder = 'timeline/documents'): Promise<string> {
  const fd = new FormData()
  // ไฟล์นี้มี file.name อยู่แล้ว (ไม่ใช่ Blob เปล่าเหมือน resizeImage) แต่ยังเสี่ยงชนกัน
  // ถ้าหลายคนอัปโหลดไฟล์ชื่อเดียวกัน (เช่น "สลิป.pdf") — ใส่ timestamp ไว้ข้างหน้ากันชน
  fd.append('file', file, `${Date.now()}_${file.name}`)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', folder)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('UPLOAD_FAILED')
  const json = await res.json()
  return json.secure_url as string
}

// URL รูปโปรไฟล์แบบ optimize สำหรับแสดงผล (q_auto,f_auto + ครอปสี่เหลี่ยมจัตุรัส)
export function avatarUrl(url: string | null | undefined, size = 160): string | null {
  if (!url) return null
  const marker = '/image/upload/'
  const i = url.indexOf(marker)
  if (i === -1) return url
  return `${url.slice(0, i + marker.length)}c_fill,g_face,q_auto,f_auto,w_${size},h_${size}/${url.slice(i + marker.length)}`
}
