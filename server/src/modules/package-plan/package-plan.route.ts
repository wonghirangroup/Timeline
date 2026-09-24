// server/src/modules/package-plan/package-plan.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { FEATURE_KEYS }     from '../../common/utils/features'
import { logActivity }      from '../../common/utils/activityLog'
import * as svc from './package-plan.service'

const TAG = 'Super Admin'

export async function packagePlanRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/packages
  app.get('/packages', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'ดูเทมเพลตแพ็กเกจทั้งหมด (FREE/STARTER/PRO/ENTERPRISE)', security: [{ oauth2: [] }] },
  }, async () => ok(await svc.listPackagePlans()))

  // PATCH /api/v1/super-admin/packages/:plan
  app.patch('/packages/:plan', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG], summary: 'แก้ไขเทมเพลตแพ็กเกจ — ไม่มีผลกับ tenant ที่ใช้ plan นี้ทันที (ต้องกด "นำไปใช้" แยก)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { plan: { type: 'string', enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] } } },
      body: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          price_monthly: { type: ['integer', 'null'] },
          color: { type: 'string' },
          bg: { type: 'string' },
          max_employees: { type: 'integer' },
          max_branches: { type: 'integer' },
          max_groups: { type: 'integer' },
          enabled_features: { type: 'object', properties: Object.fromEntries(FEATURE_KEYS.map(k => [k, { type: 'boolean' }])) },
        },
      },
    },
  }, async (req: any, reply) => {
    const row = await svc.updatePackagePlan(req.params.plan, req.body)
    if (!row) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแพ็กเกจ'))
    logActivity({ action: 'PACKAGE_UPDATED', actorName: req.user?.email ?? 'Super Admin', message: `แก้ไขเทมเพลตแพ็กเกจ "${row.label}" (${row.plan})` })
    return ok(row, 'บันทึกเทมเพลตแพ็กเกจสำเร็จ')
  })

  // POST /api/v1/super-admin/packages/:plan/apply-to-tenants
  app.post('/packages/:plan/apply-to-tenants', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG], summary: 'นำเทมเพลตแพ็กเกจไปใช้กับ tenant ทุกรายที่ใช้ plan นี้จริง (limit + feature ทับของเดิม)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { plan: { type: 'string', enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] } } },
    },
  }, async (req: any, reply) => {
    try {
      const result = await svc.applyPackagePlanToTenants(req.params.plan)
      logActivity({ action: 'PACKAGE_APPLIED', actorName: req.user?.email ?? 'Super Admin', message: `นำเทมเพลตแพ็กเกจ ${req.params.plan} ไปใช้กับ ${result.count} tenant` })
      return ok(result, `นำไปใช้กับ ${result.count} tenant สำเร็จ`)
    } catch (e: any) {
      if (e.message === 'PACKAGE_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแพ็กเกจ'))
      throw e
    }
  })
}
