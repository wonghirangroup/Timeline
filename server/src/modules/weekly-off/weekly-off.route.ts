// server/src/modules/weekly-off/weekly-off.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listWeeklyOff, createWeeklyOff, updateWeeklyOff, deleteWeeklyOff, createMonthlyOff, createMonthlyBatchOff, getMonthView, deleteMonthlyOff } from './weekly-off.service'
import { listPeriods, openPeriod, closePeriod, updatePeriod, checkPeriodOpen, notifyPeriodOpened } from './weekly-off-period.service'
import { prisma } from '../../common/utils/prisma'

export async function weeklyOffRoutes(app: FastifyInstance) {

  // ── Admin: ดูรายการ weekly off ──────────────────────────────────────
  app.get('/admin/weekly-off', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูวันหยุดสัปดาห์ของพนักงาน (กรอง weekStart / branchId / status)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          month:      { type: 'string', description: 'YYYY-MM (ทั้งเดือน)' },
          weekStart:  { type: 'string', description: 'YYYY-MM-DD (สัปดาห์เดียว)' },
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
          status:     { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
        },
      },
    },
  }, async (req: any) => {
    const list = await listWeeklyOff(req.tenantId, {
      month:      req.query.month,
      weekStart:  req.query.weekStart,
      branchId:   req.query.branchId,
      employeeId: req.query.employeeId,
      status:     req.query.status,
    })
    return ok(list)
  })

  // ── Admin: เพิ่มวันหยุดให้พนักงาน ──────────────────────────────────
  app.post('/admin/weekly-off', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'Admin เพิ่มวันหยุดสัปดาห์ให้พนักงาน',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'week_start', 'day_of_week'],
        properties: {
          employee_id: { type: 'string' },
          week_start:  { type: 'string', description: 'YYYY-MM-DD' },
          day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createWeeklyOff(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'เพิ่มวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'พนักงานนี้มีวันหยุดในสัปดาห์นี้แล้ว'))
      throw e
    }
  })

  // ── Admin: Approve ───────────────────────────────────────────────────
  app.post('/admin/weekly-off/:id/approve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, { status: 'APPROVED', reviewed_by: req.userId })
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(result, 'อนุมัติวันหยุดสำเร็จ')
  })

  // ── Admin: Reject ────────────────────────────────────────────────────
  app.post('/admin/weekly-off/:id/reject', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ปฏิเสธวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { reject_note: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, { status: 'REJECTED', reviewed_by: req.userId, reject_note: req.body?.reject_note })
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'ปฏิเสธวันหยุดแล้ว')
  })

  // ── Admin: แก้ไขวัน (เปลี่ยน day_of_week / ย้ายสัปดาห์) ───────────────
  app.patch('/admin/weekly-off/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'แก้ไขวันหยุดสัปดาห์ (เปลี่ยนวันในสัปดาห์เดิม หรือย้ายไปสัปดาห์อื่นทั้งที — ปฏิทินรวม: ลากวาง)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
          week_start:  { type: 'string', description: 'YYYY-MM-DD — ย้ายไปสัปดาห์อื่น (normalize เป็น Monday อัตโนมัติ)' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await updateWeeklyOff(req.tenantId, req.params.id, req.body)
      if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
      return ok(result, 'แก้ไขสำเร็จ')
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'พนักงานนี้มีวันหยุดในสัปดาห์ที่ย้ายไปแล้ว'))
      throw e
    }
  })

  // ── Admin: ลบ ────────────────────────────────────────────────────────
  app.delete('/admin/weekly-off/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ลบวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteWeeklyOff(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'ลบสำเร็จ')
  })

  // ── Admin: Approve ทั้งหมดในเดือน ───────────────────────────────────
  app.post('/admin/weekly-off/approve-all', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติ Weekly Off ทุกรายการที่ PENDING ในเดือนที่กำหนด',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['month'],
        properties: {
          month: { type: 'string', description: 'YYYY-MM' },
        },
      },
    },
  }, async (req: any) => {
    const { month } = req.body
    const [y, m] = month.split('-').map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end   = new Date(Date.UTC(y, m, 0))

    const pending = await prisma.weeklyOffRequest.findMany({
      where: { tenant_id: req.tenantId, status: 'PENDING', week_start: { gte: start, lte: end } },
    })

    await prisma.weeklyOffRequest.updateMany({
      where: { tenant_id: req.tenantId, status: 'PENDING', week_start: { gte: start, lte: end } },
      data:  { status: 'APPROVED', reviewed_by: req.userId, reviewed_at: new Date() },
    })

    return ok({ count: pending.length }, `อนุมัติ ${pending.length} รายการสำเร็จ`)
  })

  // ── Admin: ดูสถานะการเปิดจองต่อสาขา ─────────────────────────────────────────
  app.get('/admin/weekly-off/periods', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: { tags: ['Admin'], summary: 'ดูสถานะเปิด/ปิดการจองวันหยุดต่อสาขา', security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['month'], properties: { month: { type: 'string' } } } },
  }, async (req: any) => {
    return ok(await listPeriods(req.tenantId, req.query.month))
  })

  // ── Admin: เปิดการจองสำหรับสาขา ──────────────────────────────────────────────
  app.post('/admin/weekly-off/periods', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: { tags: ['Admin'], summary: 'เปิดการจองวันหยุดให้สาขา', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['branch_id', 'month'],
        properties: { branch_id: { type: 'string' }, month: { type: 'string' }, deadline: { type: ['string', 'null'] }, note: { type: ['string', 'null'] } } } },
  }, async (req: any, reply) => {
    const { period, justOpened } = await openPeriod(req.tenantId, req.body)
    console.log(`[openPeriod route] branch=${req.body.branch_id} month=${req.body.month} justOpened=${justOpened}`)
    // แจ้งเตือน Line ก็ต่อเมื่อเพิ่งเปิดจริง (ปิดอยู่ก่อน) — กัน spam ตอนแก้แค่ deadline/note
    // ไม่ await ผล/ไม่โยน error ต่อ เพราะการเปิดจองสำเร็จแล้วไม่ควรพังเพราะ Line ส่งไม่ได้
    if (justOpened) notifyPeriodOpened(req.tenantId, req.body.branch_id, req.body.month).catch((e: any) => console.error('[notifyPeriodOpened] uncaught:', e.message))
    return reply.code(201).send(ok(period, 'เปิดการจองสำเร็จ'))
  })

  // ── Admin: ปิดการจองสำหรับสาขา ───────────────────────────────────────────────
  app.post('/admin/weekly-off/periods/close', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: { tags: ['Admin'], summary: 'ปิดการจองวันหยุดของสาขา', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['branch_id', 'month'], properties: { branch_id: { type: 'string' }, month: { type: 'string' } } } },
  }, async (req: any, reply) => {
    await closePeriod(req.tenantId, req.body.branch_id, req.body.month)
    return ok(null, 'ปิดการจองแล้ว')
  })

  // ── Admin: แก้ deadline / note ────────────────────────────────────────────────
  app.patch('/admin/weekly-off/periods/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: { tags: ['Admin'], summary: 'แก้ไข period', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { is_open: { type: 'boolean' }, deadline: { type: ['string', 'null'] }, note: { type: ['string', 'null'] } } } },
  }, async (req: any, reply) => {
    const updated = await updatePeriod(req.tenantId, req.params.id, req.body)
    if (!updated) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'อัปเดตสำเร็จ')
  })

  // ── Employee (LIFF): เช็คว่า period เปิดไหม ────────────────────────────────
  app.get('/employee/weekly-off/period-status', {
    preHandler: [tenantMiddleware],
    schema: { tags: ['Employee'], summary: 'เช็คว่าเปิดจองอยู่ไหม (LIFF)', security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['branchId', 'month'], properties: { branchId: { type: 'string' }, month: { type: 'string' } } } },
  }, async (req: any) => {
    const isOpen = await checkPeriodOpen(req.tenantId, req.query.branchId, req.query.month)
    return ok({ is_open: isOpen })
  })

  // ── Employee (LIFF): ขอวันหยุดสัปดาห์ ──────────────────────────────
  app.post('/employee/weekly-off', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ขอวันหยุดประจำสัปดาห์ (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'week_start', 'day_of_week'],
        properties: {
          employee_id: { type: 'string' },
          week_start:  { type: 'string', description: 'YYYY-MM-DD' },
          day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createWeeklyOff(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดสัปดาห์นี้แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): ดูประวัติ weekly off ──────────────────────────
  app.get('/employee/weekly-off', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูประวัติวันหยุดสัปดาห์ของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const list = await listWeeklyOff(req.tenantId, { employeeId: req.query.employeeId })
    return ok(list)
  })

  // ── Employee (LIFF): ขอวันหยุดประจำเดือน ────────────────────────────
  app.post('/employee/weekly-off/monthly', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ขอวันหยุดประจำเดือน — 1 วันต่อเดือน (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'date'],
        properties: {
          employee_id: { type: 'string' },
          date:        { type: 'string', description: 'YYYY-MM-DD — วันที่จริงที่ต้องการหยุด' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createMonthlyOff(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดเดือนนี้แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): ขอวันหยุดทั้งเดือนรวดเดียว (weekly_off_mode = MONTHLY_BATCH) ──
  app.post('/employee/weekly-off/monthly-batch', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ขอวันหยุดครบทุกสัปดาห์ในเดือนรวดเดียว (LIFF) — สำหรับ employee ที่ weekly_off_mode = MONTHLY_BATCH',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'month', 'dates'],
        properties: {
          employee_id: { type: 'string' },
          month:       { type: 'string', description: 'YYYY-MM' },
          dates:       { type: 'array', items: { type: 'string' }, description: 'YYYY-MM-DD หนึ่งวันต่อสัปดาห์ ต้องครบทุกสัปดาห์ของเดือน' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createMonthlyBatchOff(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดทั้งเดือนสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดสัปดาห์ใดสัปดาห์หนึ่งในเดือนนี้ไปแล้ว'))
      if (e.message === 'INCOMPLETE_MONTH')  return reply.code(400).send(fail('INCOMPLETE_MONTH', 'ต้องเลือกวันหยุดให้ครบทุกสัปดาห์ของเดือนก่อนส่ง'))
      if (e.message === 'DUPLICATE_WEEK')    return reply.code(400).send(fail('DUPLICATE_WEEK', 'เลือกวันหยุดซ้ำสัปดาห์เดียวกัน'))
      throw e
    }
  })

  // ── Employee (LIFF): ดู month-view (ตัวเอง + เพื่อนร่วมสาขา) ─────────
  app.get('/employee/weekly-off/month-view', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูวันหยุดประจำเดือนของตัวเองและเพื่อนร่วมสาขา (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId', 'month'],
        properties: {
          employeeId: { type: 'string' },
          month:      { type: 'string', description: 'YYYY-MM' },
        },
      },
    },
  }, async (req: any) => {
    const { employeeId, month } = req.query
    const result = await getMonthView(req.tenantId, employeeId, month)
    return ok(result)
  })

  // ── Employee (LIFF): ยกเลิกคำขอ PENDING ของตัวเอง ────────────────────
  app.delete('/employee/weekly-off/:id', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ยกเลิกคำขอวันหยุดประจำเดือน (LIFF) — ได้เฉพาะสถานะ PENDING',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      querystring: { type: 'object', required: ['employeeId'], properties: { employeeId: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      const deleted = await deleteMonthlyOff(req.tenantId, req.params.id, req.query.employeeId)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
      return ok(null, 'ยกเลิกคำขอแล้ว')
    } catch (e: any) {
      if (e.message === 'NOT_PENDING') return reply.code(409).send(fail('NOT_PENDING', 'ยกเลิกได้เฉพาะรายการที่รอพิจารณา'))
      throw e
    }
  })
}
