// server/src/modules/issue-report/issue-report.route.ts
import { FastifyInstance } from 'fastify'
import { getTenantByChannelId } from '../line/line.service'
import { reportIssue } from './issue-report.service'
import { ok, fail } from '../../common/utils/response'

export async function issueReportRoutes(app: FastifyInstance) {

  // POST /api/v1/employee/client-diag — แอปพนักงานส่งรายละเอียดทางเทคนิคมาเองอัตโนมัติตอน boot ล้มเหลว (ไม่ต้องรอให้พนักงานกด
  // "แจ้งปัญหา") — เก็บลง log ของเซิร์ฟเวอร์อย่างเดียว ไม่ส่ง LINE หาแอดมิน (กันสแปม) ไว้ไล่หาแพทเทิร์นของ "Failed to fetch"
  app.post('/employee/client-diag', {
    schema: {
      tags: ['Employee'],
      summary: 'ส่ง diagnostic ตอน boot ล้มเหลว (ไม่ต้อง login — เก็บ log อย่างเดียว)',
      body: {
        type: 'object',
        required: ['stage'],
        properties: {
          line_channel_id: { type: 'string', maxLength: 40 },
          stage:   { type: 'string', maxLength: 40 },
          detail:  { type: 'string', maxLength: 300 },
          context: { type: 'string', maxLength: 800 },
        },
      },
    },
  }, async (req: any, reply) => {
    console.log('[client-diag]', JSON.stringify({
      at: new Date().toISOString(), ip: req.headers['x-forwarded-for'] ?? req.ip, ua: req.headers['user-agent'], ...req.body,
    }))
    return reply.code(204).send()
  })


  // POST /api/v1/employee/report-issue — แจ้งปัญหาการใช้งานแอปให้แอดมินทาง LINE
  // ตั้งใจ "ไม่ผ่าน tenantMiddleware เลย" (ไม่ต้อง JWT) เพราะจุดประสงค์หลักคือใช้
  // ตอนพนักงาน login เข้าแอปไม่ได้เลย (เช่น "Failed to Fetch" วนลูปตอน boot) — ถ้า
  // บังคับ JWT จะใช้ไม่ได้พอดีตอนที่ต้องการมันที่สุด ระบุ tenant จาก line_channel_id
  // แทน (อ่านได้ฝั่ง client จาก LIFF ID ตรงๆ ไม่ต้องเรียก API ไหนก่อน)
  app.post('/employee/report-issue', {
    schema: {
      tags: ['Employee'],
      summary: 'แจ้งปัญหาการใช้งานแอปให้แอดมินทาง LINE (ไม่ต้อง login)',
      body: {
        type: 'object',
        required: ['line_channel_id', 'message'],
        properties: {
          line_channel_id: { type: 'string' },
          line_user_id:    { type: 'string' },
          display_name:    { type: 'string' },
          message:         { type: 'string', minLength: 1, maxLength: 500 },
          context:         { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (req: any, reply) => {
    const { line_channel_id, line_user_id, display_name, message, context } = req.body
    // เก็บรายงานไว้ใน log ของเซิร์ฟเวอร์ด้วย (เดิมไปอยู่แค่ในข้อความ LINE ของแอดมิน เปิดย้อนหลังไม่ได้) —
    // ใช้ไล่หาแพทเทิร์นของอาการ "Failed to fetch" เช่น รุ่นเครื่อง/เวอร์ชัน LINE/เครือข่ายที่ตรงกัน
    console.log('[issue-report]', JSON.stringify({
      at: new Date().toISOString(), ip: req.headers['x-forwarded-for'] ?? req.ip, ua: req.headers['user-agent'],
      line_channel_id, line_user_id, display_name, message, context,
    }))
    const config = await getTenantByChannelId(line_channel_id)
    if (!config) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบริษัทสำหรับ LINE นี้'))

    await reportIssue(config.tenant.id, { displayName: display_name, lineUserId: line_user_id, message, context })
    return reply.code(201).send(ok(null, 'แจ้งปัญหาสำเร็จ — ทีมงานจะรีบดำเนินการ'))
  })
}
