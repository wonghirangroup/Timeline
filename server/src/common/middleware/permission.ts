// server/src/common/middleware/permission.ts
// ตัวกรองเสริมจาก requireRole เดิม (Phase 2 — ดู brain log v187/v188) — เช็ค
// FeaturePermission ต่อบัญชี "เพิ่มเติม" จาก requireRole ไม่ใช่แทนที่:
//   • ไม่มีแถวสิทธิ์เลย (ยังไม่เคย seed หรือ role นี้ไม่มีเทมเพลต) → อนุญาตผ่าน
//     (fallback ปลอดภัย กันคนถูกล็อกออกโดยไม่ตั้งใจถ้า seed ตกหล่นบางจุด)
//   • มีแถว และ action นั้นเป็น false → 403
// SUPER_ADMIN ไม่มี tenant/ไม่มีแถวเลย บายพาสเสมอ
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/prisma'
import type { PermissionAction } from '../permissions/features'

async function checkOne(userId: string, feature: string, action: PermissionAction): Promise<boolean> {
  const row = await prisma.featurePermission.findUnique({
    where: { user_id_feature: { user_id: userId, feature } },
  })
  if (!row) return true // ไม่มีแถว = อนุญาตผ่าน (fallback ปลอดภัย)
  return { view: row.can_view, add: row.can_add, edit: row.can_edit, delete: row.can_delete, approve: row.can_approve }[action]
}

export function requirePermission(feature: string, action: PermissionAction) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.userRole === 'SUPER_ADMIN' || !req.userId) return
    const allowed = await checkOne(req.userId, feature, action)
    if (!allowed) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ทำรายการนี้' } })
    }
  }
}

// เฉพาะบัญชีแรกที่ SUPER_ADMIN สร้างให้ตอนตั้ง tenant (User.is_root_admin) หรือ
// SUPER_ADMIN เอง — ใช้กับหน้า "ผู้ใช้งานเว็บ" (จัดการ/สร้าง/ลบบัญชีอื่นในบริษัท)
// เข้มกว่า requirePermission เพราะเป็นเรื่องยกระดับสิทธิ์คนอื่น ไม่ใช่แค่ดู/แก้ข้อมูล
// (feedback 2026-09-23 "tab ผู้ใช้งานมีแค่แอดมินที่ superadmin เป็นผู้สร้างเข้าได้")
export function requireRootAdmin() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.userRole === 'SUPER_ADMIN') return
    if (!req.userId) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์เข้าถึง' } })
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { is_root_admin: true } })
    if (!user?.is_root_admin) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะบัญชีแรกที่ผู้ดูแลระบบสร้างให้เท่านั้นที่จัดการผู้ใช้งานได้' } })
    }
  }
}

// endpoint ข้อมูลดิบที่หน้ารายงานหลายหมวดดึงมาใช้ร่วมกัน (เช่น /admin/employees
// ถูกทั้งหน้า "พนักงาน" ปกติ และหน้า "รายงานพนักงาน"/"รายงานสาขา"/"รายงานผู้บริหาร"
// เรียกใช้) — ผ่านถ้ามีสิทธิ์ "ดู" ของ feature ใดก็ได้ในลิสต์ที่ให้มา (เจ้าของข้อมูล
// จริงหรือ report ที่ใช้ข้อมูลนี้ก็ได้) กัน "เปิดแค่สิทธิ์รายงาน แต่ข้อมูลว่างเปล่า
// เพราะ endpoint เจ้าของข้อมูลจริงบล็อกไว้" (feedback 2026-09-23)
export function requirePermissionAny(checks: { feature: string; action: PermissionAction }[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.userRole === 'SUPER_ADMIN' || !req.userId) return
    const results = await Promise.all(checks.map(c => checkOne(req.userId!, c.feature, c.action)))
    if (!results.some(Boolean)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ทำรายการนี้' } })
    }
  }
}
