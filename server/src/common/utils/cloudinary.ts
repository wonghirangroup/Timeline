// server/src/common/utils/cloudinary.ts
// อัปโหลดภาพ Loading ต่อ tenant — ใช้ public_id คงที่ตาม tenantId + overwrite:true
// เพื่อให้อัปโหลดใหม่ทับของเดิมอัตโนมัติ ไม่ต้องเก็บ public_id แยกไว้เทียบตอนลบ
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function loadingImagePublicId(tenantId: string) {
  return `timeline/tenants/${tenantId}/loading-image`
}

export function uploadTenantLoadingImage(tenantId: string, buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: loadingImagePublicId(tenantId), overwrite: true, invalidate: true, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload ไม่สำเร็จ'))
        // q_auto,f_auto,w_800 — บีบขนาด/format อัตโนมัติ ตามที่ใช้ใน linecommerce-pro
        resolve(result.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_800/'))
      }
    )
    stream.end(buffer)
  })
}

export async function deleteTenantLoadingImage(tenantId: string): Promise<void> {
  await cloudinary.uploader.destroy(loadingImagePublicId(tenantId), { resource_type: 'image' })
}
