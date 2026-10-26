// server/src/modules/leave/vacation-policy.route.ts
// นโยบายพักร้อนตามอายุงาน — feedback 2026-09-15 — ปุ่มรันเอง (ไม่มี cron อัตโนมัติจนกว่า
// จะทดสอบผ่านกับ tenant จริง แล้วเปิด schedule ทีหลัง — ดู server/src/jobs/vacation-policy.job.ts)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission } from '../../common/middleware/permission'
import { requireFeature }   from '../../common/middleware/feature'
import { ok, fail }         from '../../common/utils/response'
import { previewVacationPolicy, grantUnderQuotaBonus, listUnderQuotaBonusReview, setBonusSkip, isMonthEnded, runVacationAnnualReset, listVacationRemainingReport } from './vacation-policy.service'

export async function vacationPolicyRoutes(app: FastifyInstance) {

  // ดูตัวอย่างสิทธิ์พักร้อนของพนักงาน 1 คน — ใช้ debug/preview บนหน้าตั้งค่าตำแหน่ง
  app.get('/admin/vacation-policy/preview', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), requirePermission('leave', 'view'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'พรีวิวสิทธิ์พักร้อนตามอายุงานของพนักงาน 1 คน', security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['employeeId'], properties: { employeeId: { type: 'string' } } },
    },
  }, async (req: any) => ok(await previewVacationPolicy(req.tenantId, req.query.employeeId)))

  // รันโบนัส "หยุดไม่ครบโควต้า" ของเดือนที่ระบุ (default = เดือนที่แล้ว) ด้วยมือ
  app.post('/admin/vacation-policy/run-bonus', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requirePermission('leave', 'edit'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'รันโบนัสพักร้อนตามส่วนต่างจริง (หยุดไม่ครบโควต้า) ของเดือนที่ระบุ', security: [{ oauth2: [] }],
      body: { type: 'object', properties: { ym: { type: 'string', description: 'YYYY-MM (default = เดือนที่แล้ว)' } } },
    },
  }, async (req: any, reply) => {
    const ym = req.body?.ym ?? defaultPrevYm()
    if (!isMonthEnded(ym)) return reply.code(400).send(fail('MONTH_NOT_ENDED', 'เดือนนี้ยังไม่จบ ให้โบนัสได้หลังสิ้นเดือน'))
    const r = await grantUnderQuotaBonus(req.tenantId, ym)
    return ok(r, `เดือน ${r.ym} — ให้โบนัสรวม ${r.totalDays} วัน แก่ ${r.granted} คน (หยุดครบแล้ว ${r.skipped} คน)`)
  })

  // ตรวจโบนัส "หยุดไม่ครบโควต้า" ของเดือนที่เลือก — รายชื่อที่จะได้ + กี่วัน + ให้ไปแล้วหรือยัง (ยังไม่ให้จริง)
  app.get('/admin/vacation-policy/bonus-review', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('leave', 'view'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'ตรวจรายชื่อที่จะได้โบนัสพักร้อน (หยุดไม่ครบโควต้า) ของเดือน — ยังไม่ให้จริง', security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { ym: { type: 'string', description: 'YYYY-MM (default = เดือนที่แล้ว)' } } },
    },
  }, async (req: any) => ok(await listUnderQuotaBonusReview(req.tenantId, req.query?.ym ?? defaultPrevYm())))

  // ให้โบนัสเฉพาะพนักงานที่แอดมินเลือก (คำนวณจำนวนวันใหม่ฝั่งเซิร์ฟเวอร์เสมอ · ให้เดือนเดียวกันซ้ำไม่ได้)
  app.post('/admin/vacation-policy/bonus-review/grant', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requirePermission('leave', 'edit'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'ให้โบนัสพักร้อนเฉพาะพนักงานที่เลือก', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['ym', 'employee_ids'], properties: { ym: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, employee_ids: { type: 'array', minItems: 1, maxItems: 500, items: { type: 'string' } } } },
    },
  }, async (req: any, reply) => {
    if (!isMonthEnded(req.body.ym)) return reply.code(400).send(fail('MONTH_NOT_ENDED', 'เดือนนี้ยังไม่จบ ดูประมาณการได้ แต่ให้โบนัสได้หลังสิ้นเดือน'))
    const r = await grantUnderQuotaBonus(req.tenantId, req.body.ym, req.body.employee_ids)
    return ok(r, `ให้โบนัสพักร้อนเดือน ${r.ym} รวม ${r.totalDays} วัน แก่ ${r.granted} คน`)
  })

  // กำหนดล่วงหน้าว่า "ไม่ให้" โบนัสของคนนี้ในเดือนนี้ (เดือนไหนก็ตั้งได้ รวมเดือนที่ยังไม่จบ) — cron อัตโนมัติจะข้าม และหน้าตรวจจะไม่ติ๊กให้
  app.put('/admin/vacation-policy/bonus-review/skip', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requirePermission('leave', 'edit'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'ตั้ง/ยกเลิก "ไม่ให้โบนัสพักร้อน" รายคนต่อเดือน', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['ym', 'employee_id', 'skip'], properties: { ym: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, employee_id: { type: 'string' }, skip: { type: 'boolean' } } },
    },
  }, async (req: any) => {
    await setBonusSkip(req.tenantId, req.body.employee_id, req.body.ym, req.body.skip, req.userId)
    return ok({ ok: true })
  })

  // รัน reset ประจำปี (default = ปีนี้) ด้วยมือ — ตั้ง total_days ใหม่ตามสูตรอายุงาน
  app.post('/admin/vacation-policy/run-reset', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requirePermission('leave', 'edit'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'รัน reset พักร้อนประจำปีตามสูตรอายุงาน (default = ปีนี้)', security: [{ oauth2: [] }],
      body: { type: 'object', properties: { year: { type: 'integer' } } },
    },
  }, async (req: any) => {
    const year = req.body?.year ?? new Date().getUTCFullYear()
    const r = await runVacationAnnualReset(req.tenantId, year)
    return ok(r, `ปี ${r.year} — reset ${r.reset} คน (ข้าม ${r.skipped} คนที่ไม่อยู่ในโปรแกรมพักร้อน)`)
  })

  // รายงานพักร้อนคงเหลือของปีก่อน (ขายคืนได้ไม่เกิน 10 วัน — HR คิดจ่ายนอกระบบ)
  app.get('/admin/vacation-policy/remaining-report', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requirePermission('leave', 'view'), requireFeature('vacation_policy')],
    schema: {
      tags: ['Admin'], summary: 'รายงานพักร้อนคงเหลือของปีที่ระบุ (default = ปีที่แล้ว)', security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { year: { type: 'integer' } } },
    },
  }, async (req: any) => {
    const year = req.query.year ?? new Date().getUTCFullYear() - 1
    return ok(await listVacationRemainingReport(req.tenantId, year))
  })
}

function defaultPrevYm(): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
