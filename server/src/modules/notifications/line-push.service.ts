// server/src/modules/notifications/line-push.service.ts
// แจ้งเตือนแอดมิน/หัวหน้าแผนกทาง LINE เมื่อมีคำขอใหม่ที่ "ต้องดำเนินการ" (ลา/OT/ลาออก/จองวันหยุด)
// เข้ามา — ส่งเป็น Flex Message (การ์ด + ปุ่มเปิดไปหน้าอนุมัติตรง) ไม่ใช่ข้อความล้วน
// ใช้ LINE ที่ผูกไว้แล้วผ่านการเป็นพนักงาน (Employee.line_user_id) ของแอดมินที่มี
// สิทธิ์เข้าเว็บแอดมิน (Employee.user_id) เท่านั้น — แอดมินที่ไม่มี Employee ผูกอยู่ (ล็อกอิน
// อีเมล/รหัสผ่านล้วน) จะไม่ได้รับ เพราะระบบยังไม่มีการผูกไลน์แยกสำหรับแอดมิน
//
// best-effort เสมอ — พังยังไงก็ห้ามทำให้ flow หลัก (สร้างคำขอ) ล้มตาม จับ error ทั้งหมดในนี้
import { prisma } from '../../common/utils/prisma'
import { lineMulticast } from '../announcement/announcement.service'

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || 'https://timeline-admin.vercel.app'

export interface AdminLineNotice {
  title: string     // หัวการ์ด เช่น "ใบลารออนุมัติ"
  detail: string    // รายละเอียด เช่น "ลาป่วย 11 ก.ย. (1 วัน)"
  color: string     // สีหัวการ์ด/ปุ่ม (hex)
  path?: string     // path สัมพัทธ์ในเว็บแอดมิน เช่น "/leave?tab=requests&approve=<id>" — ไม่ใส่ = ไม่มีปุ่ม
  buttonLabel?: string
}

function buildFlexMessage(empName: string, n: AdminLineNotice) {
  const footer = n.path ? {
    footer: {
      type: 'box', layout: 'vertical', paddingAll: '12px', spacing: 'sm',
      contents: [{
        type: 'button', style: 'primary', color: n.color, height: 'sm',
        action: { type: 'uri', label: n.buttonLabel ?? 'เปิดดู / อนุมัติ', uri: `${ADMIN_APP_URL}${n.path}` },
      }],
    },
  } : {}
  return {
    type: 'flex',
    altText: `🔔 ${n.title} — ${empName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: n.color, paddingAll: '14px',
        contents: [{ type: 'text', text: n.title, color: '#ffffff', weight: 'bold', size: 'sm', wrap: true }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          { type: 'text', text: empName, weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: n.detail, size: 'sm', color: '#666666', wrap: true },
        ],
      },
      ...footer,
    },
  }
}

export async function notifyAdminsLine(tenantId: string, employeeId: string, notice: AdminLineNotice): Promise<void> {
  try {
    const [lineConfig, emp] = await Promise.all([
      prisma.tenantLineConfig.findUnique({ where: { tenant_id: tenantId }, select: { line_channel_access_token: true } }),
      prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId }, select: { first_name: true, last_name: true, nickname: true, position_id: true } }),
    ])
    if (!lineConfig?.line_channel_access_token || !emp) return

    // ADMIN/MANAGER เห็นทั้ง tenant — ได้แจ้งเตือนทุกคำขอ
    const admins = await prisma.user.findMany({
      where: { tenant_id: tenantId, is_active: true, role: { in: ['ADMIN', 'MANAGER'] } },
      select: { linked_employee: { select: { line_user_id: true } } },
    })
    const ids = admins.map(a => a.linked_employee?.line_user_id).filter((v): v is string => !!v)

    // DEPT_HEAD เห็นเฉพาะแผนกตัวเอง — แจ้งเฉพาะเมื่อพนักงานเจ้าของคำขออยู่ในแผนกที่ดูแล
    if (emp.position_id) {
      const pos = await prisma.position.findFirst({ where: { id: emp.position_id }, select: { department_id: true } })
      if (pos) {
        const heads = await prisma.user.findMany({
          where: { tenant_id: tenantId, is_active: true, role: 'DEPT_HEAD', managed_departments: { some: { department_id: pos.department_id } } },
          select: { linked_employee: { select: { line_user_id: true } } },
        })
        for (const h of heads) if (h.linked_employee?.line_user_id) ids.push(h.linked_employee.line_user_id)
      }
    }

    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) return

    const empName = emp.nickname ? `${emp.first_name} (${emp.nickname})` : `${emp.first_name} ${emp.last_name}`
    await lineMulticast(lineConfig.line_channel_access_token, uniqueIds, buildFlexMessage(empName, notice))
  } catch (e) {
    console.error('[line-push] ส่งแจ้งเตือนแอดมินทาง LINE ไม่สำเร็จ:', e)
  }
}
