// server/src/modules/notifications/line-push.service.ts
// แจ้งเตือนแอดมิน/หัวหน้าแผนกทาง LINE เมื่อมีคำขอใหม่ที่ "ต้องดำเนินการ" (ลา/OT/ลาออก/จองวันหยุด)
// เข้ามา — ส่งเป็น Flex Message (การ์ด + ปุ่มเปิดไปหน้าอนุมัติตรง) ไม่ใช่ข้อความล้วน
// ใช้ LINE ที่ผูกไว้แล้วผ่านการเป็นพนักงาน (Employee.line_user_id) ของแอดมินที่มี
// สิทธิ์เข้าเว็บแอดมิน (Employee.user_id) เท่านั้น — แอดมินที่ไม่มี Employee ผูกอยู่ (ล็อกอิน
// อีเมล/รหัสผ่านล้วน) จะไม่ได้รับ เพราะระบบยังไม่มีการผูกไลน์แยกสำหรับแอดมิน
//
// best-effort เสมอ — พังยังไงก็ห้ามทำให้ flow หลัก (สร้างคำขอ) ล้มตาม จับ error ทั้งหมดในนี้
import { prisma } from '../../common/utils/prisma'
import { lineMulticast, linePush } from '../announcement/announcement.service'
import { isNotificationEnabled, type NotificationType } from '../../common/utils/notificationPrefs'
import { createMagicLoginToken } from '../auth/auth.service'
import { logLineSend } from './line-log.service'

const ADMIN_APP_URL    = process.env.ADMIN_APP_URL    || 'https://timeline-admin.vercel.app'
const EMPLOYEE_APP_URL = process.env.EMPLOYEE_APP_URL || 'https://timeline-employee.vercel.app'

// ฟิลด์ร่วมของการ์ดแจ้งเตือนทั้งสองแบบ (ฝั่งแอดมิน/ฝั่งพนักงาน) — buildFlexMessage
// ใช้แค่ฟิลด์พวกนี้ ไม่แตะ `type` (เป็นแค่ตัวเช็ค pref ก่อนส่ง ไม่ได้โผล่ในการ์ด)
interface LineNoticeCard {
  title: string     // หัวการ์ด เช่น "ใบลารออนุมัติ"
  detail: string    // รายละเอียด เช่น "ลาป่วย 11 ก.ย. (1 วัน)"
  color: string     // สีหัวการ์ด/ปุ่ม (hex)
  path?: string     // path สัมพัทธ์ — ไม่ใส่ = ไม่มีปุ่ม
  buttonLabel?: string
}

export interface AdminLineNotice extends LineNoticeCard {
  type: NotificationType  // ประเภทการแจ้งเตือน — เช็คกับ Tenant.notification_prefs ก่อนส่งเสมอ
}

// actionUrl = URI เต็มพร้อมใช้ (เช่น magic-login link ที่มี token เฉพาะคนแล้ว) — ถ้าไม่ส่งมา
// จะประกอบจาก baseUrl+path แบบเดิม (ใช้กับฝั่งพนักงาน/LIFF ที่ยังไม่มี auto-login)
function buildFlexMessage(empName: string, n: LineNoticeCard, baseUrl: string = ADMIN_APP_URL, actionUrl?: string) {
  const uri = actionUrl ?? (n.path ? `${baseUrl}${n.path}` : undefined)
  const footer = uri ? {
    footer: {
      type: 'box', layout: 'vertical', paddingAll: '12px', spacing: 'sm',
      contents: [{
        type: 'button', style: 'primary', color: n.color, height: 'sm',
        action: { type: 'uri', label: n.buttonLabel ?? 'เปิดดู / อนุมัติ', uri },
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
    const [tenant, lineConfig, emp] = await Promise.all([
      prisma.tenant.findFirst({ where: { id: tenantId }, select: { notification_prefs: true } }),
      prisma.tenantLineConfig.findUnique({ where: { tenant_id: tenantId }, select: { line_channel_access_token: true } }),
      prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId }, select: { first_name: true, last_name: true, nickname: true, position_id: true } }),
    ])
    if (!isNotificationEnabled(tenant?.notification_prefs, notice.type)) return
    if (!lineConfig?.line_channel_access_token || !emp) return

    // ADMIN/MANAGER เห็นทั้ง tenant — ได้แจ้งเตือนทุกคำขอ
    const adminSelect = { id: true, email: true, linked_employee: { select: { line_user_id: true, first_name: true, last_name: true, nickname: true } } } as const
    const adminName = (a: { email: string; linked_employee: { first_name: string; last_name: string; nickname: string | null } | null }) =>
      a.linked_employee ? (a.linked_employee.nickname || `${a.linked_employee.first_name} ${a.linked_employee.last_name}`) : a.email
    const admins = await prisma.user.findMany({
      where: { tenant_id: tenantId, is_active: true, role: { in: ['ADMIN', 'MANAGER'] } },
      select: adminSelect,
    })
    const pairs = admins
      .filter(a => a.linked_employee?.line_user_id)
      .map(a => ({ userId: a.id, lineUserId: a.linked_employee!.line_user_id!, name: adminName(a) }))

    // DEPT_HEAD เห็นเฉพาะแผนกตัวเอง — แจ้งเฉพาะเมื่อพนักงานเจ้าของคำขออยู่ในแผนกที่ดูแล
    if (emp.position_id) {
      const pos = await prisma.position.findFirst({ where: { id: emp.position_id }, select: { department_id: true } })
      if (pos) {
        const heads = await prisma.user.findMany({
          where: { tenant_id: tenantId, is_active: true, role: 'DEPT_HEAD', managed_departments: { some: { department_id: pos.department_id } } },
          select: adminSelect,
        })
        for (const h of heads) if (h.linked_employee?.line_user_id) pairs.push({ userId: h.id, lineUserId: h.linked_employee.line_user_id, name: adminName(h) })
      }
    }

    // กันซ้ำด้วย lineUserId (คนเดียวโดนแจ้งซ้ำจาก role ต่างกันไม่ได้ในทางปฏิบัติ แต่กันไว้)
    const uniquePairs = [...new Map(pairs.map(p => [p.lineUserId, p])).values()]
    if (uniquePairs.length === 0) return

    const empName = emp.nickname ? `${emp.first_name} (${emp.nickname})` : `${emp.first_name} ${emp.last_name}`

    if (!notice.path) {
      // ไม่มีปุ่ม/ลิงก์ — ไม่ต้อง personalize ส่ง multicast เดียวจบแบบเดิม (ประหยัด API call)
      try {
        await lineMulticast(lineConfig.line_channel_access_token, uniquePairs.map(p => p.lineUserId), buildFlexMessage(empName, notice))
        await logLineSend({ tenantId, category: notice.type, title: notice.title, success: true,
          recipients: uniquePairs.map(p => ({ type: 'ADMIN', id: p.userId, label: p.name })) })
      } catch (e: any) {
        await logLineSend({ tenantId, category: notice.type, title: notice.title, success: false, errorMessage: e?.message,
          recipients: uniquePairs.map(p => ({ type: 'ADMIN', id: p.userId, label: p.name })) })
        throw e
      }
      return
    }

    // มีปุ่ม — ออก magic-login token เฉพาะคน (feedback 2026-09-15: กดจากไลน์แล้วอยาก
    // login อัตโนมัติ) เลยต้อง push แยกทีละคนแทน multicast ข้อความเดียวกัน
    await Promise.all(uniquePairs.map(async p => {
      try {
        const token = await createMagicLoginToken(p.userId, notice.path)
        const url = `${ADMIN_APP_URL}/magic-login?token=${token}`
        await linePush(lineConfig.line_channel_access_token!, p.lineUserId, buildFlexMessage(empName, notice, ADMIN_APP_URL, url))
        await logLineSend({ tenantId, category: notice.type, title: notice.title, success: true,
          recipients: [{ type: 'ADMIN', id: p.userId, label: p.name }] })
      } catch (e: any) {
        console.error('[line-push] ส่ง magic-login ให้ผู้รับรายคนไม่สำเร็จ:', e)
        await logLineSend({ tenantId, category: notice.type, title: notice.title, success: false, errorMessage: e?.message,
          recipients: [{ type: 'ADMIN', id: p.userId, label: p.name }] })
      }
    }))
  } catch (e) {
    console.error('[line-push] ส่งแจ้งเตือนแอดมินทาง LINE ไม่สำเร็จ:', e)
  }
}

// ── แจ้งเตือนพนักงานคนเดียวทาง LINE (ต่างจาก notifyAdminsLine ที่ยิงหาแอดมินทั้งชุด) ──
// ใช้กับ flow ที่พนักงานคุยกันเอง เช่น "เพื่อนขอสลับวันหยุด" — การ์ดเปิดไป
// แอปพนักงาน (LIFF) ไม่ใช่เว็บแอดมิน ส่งจาก header ที่ระบุชื่อผู้ส่ง (fromName)
// แทน "ชื่อตัวเอง" เหมือน notifyAdminsLine เพราะบริบทต่างกัน (นี่คือคนอื่นทำอะไรถึงตัวเอง)
export interface EmployeeLineNotice {
  title: string
  detail: string
  color: string
  path?: string     // path สัมพัทธ์ในแอปพนักงาน (LIFF) เช่น "/leave?tab=booking&swap=<id>"
  buttonLabel?: string
}

export async function notifyEmployeeLine(tenantId: string, employeeId: string, fromName: string, notice: EmployeeLineNotice): Promise<void> {
  try {
    const [lineConfig, emp] = await Promise.all([
      prisma.tenantLineConfig.findUnique({ where: { tenant_id: tenantId }, select: { line_channel_access_token: true } }),
      prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId }, select: { line_user_id: true, first_name: true, last_name: true, nickname: true } }),
    ])
    if (!lineConfig?.line_channel_access_token || !emp?.line_user_id) return

    const label = emp.nickname || `${emp.first_name} ${emp.last_name}`
    try {
      await lineMulticast(lineConfig.line_channel_access_token, [emp.line_user_id], buildFlexMessage(fromName, notice, EMPLOYEE_APP_URL))
      await logLineSend({ tenantId, category: 'EMPLOYEE_NOTICE', title: notice.title, success: true,
        recipients: [{ type: 'EMPLOYEE', id: employeeId, label }] })
    } catch (e: any) {
      await logLineSend({ tenantId, category: 'EMPLOYEE_NOTICE', title: notice.title, success: false, errorMessage: e?.message,
        recipients: [{ type: 'EMPLOYEE', id: employeeId, label }] })
      throw e
    }
  } catch (e) {
    console.error('[line-push] ส่งแจ้งเตือนพนักงานทาง LINE ไม่สำเร็จ:', e)
  }
}
