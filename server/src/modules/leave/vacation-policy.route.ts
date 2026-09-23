// server/src/modules/leave/vacation-policy.route.ts
// นโยบายพักร้อนตามอายุงาน — feedback 2026-09-15 — ปุ่มรันเอง (ไม่มี cron อัตโนมัติจนกว่า
// จะทดสอบผ่านกับ tenant จริง แล้วเปิด schedule ทีหลัง — ดู server/src/jobs/vacation-policy.job.ts)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission } from '../../common/middleware/permission'
import { requireFeature }   from '../../common/middleware/feature'
import { ok }               from '../../common/utils/response'
import { previewVacationPolicy, grantUnderQuotaBonus, runVacationAnnualReset, listVacationRemainingReport } from './vacation-policy.service'

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
      tags: ['Admin'], summary: 'รันโบนัส +1 พักร้อน (หยุดไม่ครบโควต้า) ของเดือนที่ระบุ', security: [{ oauth2: [] }],
      body: { type: 'object', properties: { ym: { type: 'string', description: 'YYYY-MM (default = เดือนที่แล้ว)' } } },
    },
  }, async (req: any) => {
    const ym = req.body?.ym ?? defaultPrevYm()
    const r = await grantUnderQuotaBonus(req.tenantId, ym)
    return ok(r, `เดือน ${r.ym} — ให้โบนัส ${r.granted} คน (ข้าม ${r.skipped} คนที่หยุดครบแล้ว, ${r.ineligible} คนไม่อยู่ในโปรแกรมพักร้อน)`)
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
