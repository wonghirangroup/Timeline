// server/src/modules/feedback/feedback.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requireFeature }   from '../../common/middleware/feature'
import { ok }                from '../../common/utils/response'
import { createFeedback, listFeedback } from './feedback.service'

const CATEGORY_ENUM = ['WELFARE', 'WORK_ENV', 'MANAGEMENT', 'SALARY', 'OTHER']

export async function feedbackRoutes(app: FastifyInstance) {

  // POST /api/v1/employee/feedback — ส่งความคิดเห็นแบบไม่ระบุตัวตน (LIFF)
  // ไม่ผูก employee_id ใดๆ กับ record ที่บันทึก — ตั้งใจ ตาม UI ที่บอกผู้ใช้ไว้
  app.post('/employee/feedback', {
    preHandler: [tenantMiddleware, requireFeature('feedback')],
    schema: {
      tags: ['Employee'],
      summary: 'ส่งความคิดเห็นแบบไม่ระบุตัวตน (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['category', 'content'],
        properties: {
          category: { type: 'string', enum: CATEGORY_ENUM },
          content:  { type: 'string', minLength: 10, maxLength: 500 },
        },
      },
    },
  }, async (req: any, reply) => {
    const feedback = await createFeedback(req.tenantId, req.body.category, req.body.content)
    return reply.code(201).send(ok({ id: feedback.id }, 'ส่งความคิดเห็นสำเร็จ'))
  })

  // GET /api/v1/admin/feedback — Admin/Manager ดูความคิดเห็นที่ส่งเข้ามา (ไม่ระบุตัวตน)
  app.get('/admin/feedback', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requireFeature('feedback')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูความคิดเห็นที่พนักงานส่งเข้ามา (ไม่ระบุตัวตน)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { category: { type: 'string', enum: CATEGORY_ENUM } },
      },
    },
  }, async (req: any) => {
    const list = await listFeedback(req.tenantId, req.query.category)
    return ok(list)
  })
}
