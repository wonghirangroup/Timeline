// อัปโหลดรูปผ่าน Cloudinary (unsigned upload preset) — บัญชีเดียวกับ admin/
// (admin/src/lib/upload.ts) ใช้กับแบนเนอร์หน้า login เท่านั้น — ย่อขนาดใหญ่กว่า
// รูปโปรไฟล์พนักงาน (maxDim 1200 ไม่ใช่ 640) เพราะแบนเนอร์เต็มความสูงจอฝั่งซ้าย
// ของหน้า login ถ้าย่อเท่ารูปโปรไฟล์จะแตก/เบลอตอนขยายเต็มพาเนล
const CLOUD_NAME    = 'dffqpiizc'
const UPLOAD_PRESET = 'my_shop_preset'
const FOLDER        = 'timeline/login-ads'

async function resizeImage(file: File, maxDim = 1200, quality = 0.88): Promise<Blob> {
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

export async function uploadLoginAdImage(file: File): Promise<string> {
  const blob = await resizeImage(file).catch(() => file)
  const fd = new FormData()
  // ต้องตั้งชื่อไฟล์เอง กัน public_id ชนกันทุกคนที่อัปโหลด (ดู admin/src/lib/upload.ts
  // สำหรับ incident เดิมที่เจอปัญหานี้กับรูปโปรไฟล์พนักงาน)
  fd.append('file', blob, `ad_${Date.now()}.jpg`)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', FOLDER)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('UPLOAD_FAILED')
  const json = await res.json()
  return json.secure_url as string
}
