// server/src/common/utils/auditLog.ts
// บันทึกกิจกรรมระดับข้อมูลพนักงาน (feedback 2026-09-28) — ดู AuditLog model ใน
// schema.prisma สำหรับเหตุผลที่แยกจาก ActivityLog เดิม
import { prisma } from './prisma'

export type AuditAction =
  | 'EMPLOYEE_CREATED' | 'EMPLOYEE_UPDATED' | 'EMPLOYEE_DELETED' | 'NOTIFICATION_SENT'
  // บัญชีเข้าเว็บแอดมิน (หน้า ตั้งค่า → ผู้ใช้งานเว็บ และปุ่มให้/ถอนสิทธิ์ในหน้าพนักงาน)
  | 'WEB_USER_CREATED' | 'WEB_USER_UPDATED' | 'WEB_USER_DELETED'

export const WEB_ROLE_LABEL: Record<string, string> = {
  ADMIN: 'แอดมิน', MANAGER: 'ผู้จัดการ', EXECUTIVE: 'ผู้บริหาร', DEPT_HEAD: 'หัวหน้าแผนก',
}

// ข้อมูลที่ใช้เขียน log ของบัญชีเว็บ — ถ้าบัญชีผูกกับพนักงาน ใช้สาขาของพนักงานคนนั้น
// เพื่อให้แอดมินที่ดูเฉพาะสาขาเห็นรายการนี้ด้วย
export async function webUserLogInfo(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true, first_name: true, last_name: true, role: true,
      linked_employee: { select: { employee_code: true, branch_id: true } },
    },
  })
  if (!u) return null
  return {
    name: `${u.first_name} ${u.last_name}`.trim() || u.email,
    email: u.email,
    role: WEB_ROLE_LABEL[u.role] ?? u.role,
    branchId: u.linked_employee?.branch_id ?? null,
    employeeCode: u.linked_employee?.employee_code ?? null,
  }
}

// เหมือน logActivity — ตั้งใจให้ล้มเหลวแบบเงียบๆ (catch ไว้ในตัว) ไม่ให้ action
// หลัก (เช่น แก้ข้อมูลพนักงาน) fail ตามไปด้วยถ้าการบันทึก log มีปัญหา
export async function logAudit(data: {
  tenantId:   string
  branchId?:  string | null
  actorName:  string
  action:     AuditAction
  entityName: string
  message:    string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenant_id:   data.tenantId,
        branch_id:   data.branchId ?? null,
        actor_name:  data.actorName,
        action:      data.action,
        entity_name: data.entityName,
        message:     data.message,
      },
    })
  } catch {
    // เงียบไว้ — ไม่ให้กระทบ action หลัก
  }
}

// resolve ชื่อผู้ทำ action จาก userId (JWT payload มีแค่ id ไม่มี email/ชื่อติดมา
// ด้วย) — cache ไม่ทำเพราะเรียกไม่บ่อย (แค่ตอน CRUD พนักงาน ไม่ใช่ทุก request)
export async function resolveActorName(userId?: string): Promise<string> {
  if (!userId) return 'ระบบ'
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, first_name: true, last_name: true } })
  if (!user) return 'ไม่ทราบผู้ใช้'
  const fullName = `${user.first_name} ${user.last_name}`.trim()
  return fullName || user.email
}
