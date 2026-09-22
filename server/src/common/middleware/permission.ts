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

export function requirePermission(feature: string, action: PermissionAction) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.userRole === 'SUPER_ADMIN' || !req.userId) return
    const row = await prisma.featurePermission.findUnique({
      where: { user_id_feature: { user_id: req.userId, feature } },
    })
    if (!row) return
    const allowed = { view: row.can_view, add: row.can_add, edit: row.can_edit, delete: row.can_delete, approve: row.can_approve }[action]
    if (!allowed) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ทำรายการนี้' } })
    }
  }
}
