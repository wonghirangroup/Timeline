// server/src/modules/branding/branding.route.ts
// ให้ Admin ของแต่ละ tenant เพิ่ม/ลบภาพ Loading หน้าเข้าสู่ระบบ LIFF ของตัวเอง (เก็บบน Cloudinary)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { getLoadingImage, setLoadingImage, removeLoadingImage } from './branding.service'

const TAG = 'Admin'
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function brandingRoutes(app: FastifyInstance) {

  // GET /api/v1/admin/settings/loading-image
  app.get('/settings/loading-image', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
    schema: {
      tags: [TAG],
      summary: 'ดูภาพ Loading หน้าเข้าสู่ระบบปัจจุบันของ tenant',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => {
    const url = await getLoadingImage(req.tenantId)
    return ok({ loading_image_url: url })
  })

  // POST /api/v1/admin/settings/loading-image  (multipart/form-data, field name: file)
  app.post('/settings/loading-image', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'อัปโหลด/แทนที่ภาพ Loading ของ tenant (จำกัด 5MB, jpg/png/webp/gif)',
      security: [{ oauth2: [] }],
    },
  }, async (req: any, reply) => {
    const file = await req.file()
    if (!file) return reply.code(400).send(fail('NO_FILE', 'ไม่พบไฟล์ที่อัปโหลด'))
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return reply.code(400).send(fail('INVALID_TYPE', 'รองรับเฉพาะไฟล์ภาพ JPG, PNG, WEBP, GIF'))
    }

    const buffer = await file.toBuffer()
    if ((file.file as any).truncated) {
      return reply.code(400).send(fail('FILE_TOO_LARGE', 'ไฟล์มีขนาดใหญ่เกิน 5MB'))
    }

    try {
      const url = await setLoadingImage(req.tenantId, buffer)
      return ok({ loading_image_url: url }, 'อัปโหลดภาพสำเร็จ')
    } catch (e: any) {
      req.log?.error(e)
      return reply.code(502).send(fail('UPLOAD_FAILED', 'อัปโหลดภาพไม่สำเร็จ ลองใหม่อีกครั้ง'))
    }
  })

  // DELETE /api/v1/admin/settings/loading-image
  app.delete('/settings/loading-image', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบภาพ Loading ของ tenant (กลับไปใช้ค่าเริ่มต้น)',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => {
    await removeLoadingImage(req.tenantId)
    return ok(null, 'ลบภาพสำเร็จ')
  })
}
