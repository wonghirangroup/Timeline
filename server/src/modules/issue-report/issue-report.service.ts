// server/src/modules/issue-report/issue-report.service.ts
// ให้พนักงานแจ้งปัญหาการใช้งานแอปกลับมาหาแอดมินทาง LINE ได้ "แม้ล็อกอินเข้าแอปไม่ได้เลย"
// (feedback 2026-09-14: มี 2 คนเจอ "Failed to Fetch" ตอนเช็คอิน วนลูป ไม่มีทางแจ้งอะไรได้
// เลยนอกจากทักไปหาแอดมินตรงๆ) — ต่างจาก /employee/feedback (ความคิดเห็นทั่วไป ไม่ระบุตัวตน
// ต้อง login ก่อน) ตัวนี้ตั้งใจ "ไม่ระบุตัวตนไม่ได้" เพราะจุดประสงค์คือช่วยตามปัญหาของคนๆ นั้น
// จริงๆ เลยแนบชื่อ LINE ไปด้วยถ้ามี ไม่ใช่กล่องความเห็นแบบไม่ระบุตัวตน
import { prisma } from '../../common/utils/prisma'
import { lineMulticast } from '../announcement/announcement.service'
import { logLineSend } from '../notifications/line-log.service'

export async function reportIssue(tenantId: string, data: {
  displayName?: string
  lineUserId?:  string
  message:      string
  context?:     string   // รายละเอียดทางเทคนิค เช่น error message ดิบ — ไม่บังคับ
}): Promise<{ sent: number }> {
  // best-effort เสมอเหมือน notifyAdminsLine — ต่อให้ส่ง LINE ไม่สำเร็จ (เช่น
  // เครือข่ายฝั่งเราเองมีปัญหาพอดี) ก็ไม่ควรทำให้พนักงานเห็น error กลับไปอีก
  // เพราะจุดประสงค์คือ "อย่างน้อยก็มีคนได้รับรู้" — ถ้าพังก็แค่ log ไว้
  try {
    const lineConfig = await prisma.tenantLineConfig.findUnique({
      where: { tenant_id: tenantId }, select: { line_channel_access_token: true },
    })
    if (!lineConfig?.line_channel_access_token) return { sent: 0 }

    const admins = await prisma.user.findMany({
      where: { tenant_id: tenantId, is_active: true, role: { in: ['ADMIN', 'MANAGER'] } },
      select: { id: true, email: true, linked_employee: { select: { line_user_id: true, first_name: true, last_name: true, nickname: true } } },
    })
    const recipientMap = new Map(admins
      .filter(a => a.linked_employee?.line_user_id)
      .map(a => [a.linked_employee!.line_user_id!, {
        type: 'ADMIN' as const, id: a.id,
        label: a.linked_employee!.nickname || `${a.linked_employee!.first_name} ${a.linked_employee!.last_name}`,
      }]))
    const ids = [...recipientMap.keys()]
    if (ids.length === 0) return { sent: 0 }

    const who = data.displayName || (data.lineUserId ? `LINE UID: ${data.lineUserId}` : 'ไม่ทราบตัวตน (ไม่มีข้อมูล LINE ส่งมาด้วย)')
    const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' })
    const text = `🚨 พนักงานแจ้งปัญหาการใช้งานแอป TimeLine\n\n`
      + `จาก: ${who}\n`
      + `เวลา: ${now}\n\n`
      + `รายละเอียดที่แจ้ง:\n${data.message}`
      + (data.context ? `\n\n(ข้อความ error ดิบ: ${data.context})` : '')

    const title = `แจ้งปัญหาจาก ${who}`
    try {
      const result = await lineMulticast(lineConfig.line_channel_access_token, ids, text)
      await logLineSend({ tenantId, category: 'ISSUE_REPORT', title, success: true, recipients: [...recipientMap.values()] })
      return result
    } catch (err: any) {
      await logLineSend({ tenantId, category: 'ISSUE_REPORT', title, success: false, errorMessage: err.message, recipients: [...recipientMap.values()] })
      throw err
    }
  } catch (e) {
    console.error('[issue-report] ส่งแจ้งเตือนแอดมินทาง LINE ไม่สำเร็จ:', e)
    return { sent: 0 }
  }
}
