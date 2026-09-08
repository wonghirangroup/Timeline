// อัปโหลดรูปผ่าน Cloudinary (unsigned upload preset)
// ใช้บัญชีเดียวกับ linecommerce-pro
const CLOUD_NAME    = 'dffqpiizc'
const UPLOAD_PRESET = 'my_shop_preset'
const FOLDER        = 'timeline/employees'

export const cloudinaryEnabled = true

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
  const blob = await resizeImage(file).catch(() => file)
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', FOLDER)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('UPLOAD_FAILED')
  const json = await res.json()
  return json.secure_url as string
}

export function avatarUrl(url: string | null | undefined, size = 160): string | null {
  if (!url) return null
  const marker = '/image/upload/'
  const i = url.indexOf(marker)
  if (i === -1) return url
  return `${url.slice(0, i + marker.length)}c_fill,g_face,q_auto,f_auto,w_${size},h_${size}/${url.slice(i + marker.length)}`
}
