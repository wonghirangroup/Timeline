// server/src/modules/weekly-off/weekly-off.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok, fail }         from '../../common/utils/response'
import {
  listWeeklyOff, createWeeklyOff, updateWeeklyOff, deleteWeeklyOff, createMonthlyOff, createMonthlyBatchOff,
  getMonthView, deleteMonthlyOff, listWorkedOnOwnDayOffAlerts, resolveWorkedOnOwnDayOffAlert, swapWeeklyOff,
  requestWeeklyOffSwap, listMyWeeklyOffSwapRequests, respondWeeklyOffSwap, resolveActualDateStr,
} from './weekly-off.service'
import { listPeriods, openPeriod, closePeriod, updatePeriod, checkPeriodOpen, notifyPeriodOpened } from './weekly-off-period.service'
import { prisma } from '../../common/utils/prisma'
import { notifyAdminsLine, notifyEmployeeLine } from '../notifications/line-push.service'

const DOW_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export async function weeklyOffRoutes(app: FastifyInstance) {

  // ── Admin: ดูรายการ weekly off ──────────────────────────────────────
  app.get('/admin/weekly-off', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'ดูวันหยุดสัปดาห์ของพนักงาน (กรอง weekStart / branchId / status — DEPT_HEAD เห็นแค่แผนกที่ดูแล)',
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
      scopedEmployeeIds: req.scopedEmployeeIds,
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
          force:       { type: 'boolean', description: 'true = ยืนยันเพิ่มให้ ทั้งที่ cascade ปิดสิทธิ์จองวันหยุด (เก็บ audit)' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createWeeklyOff(req.tenantId, req.body, { force: req.body.force === true, actorUserId: req.userId })
      return reply.code(201).send(ok(result, 'เพิ่มวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'พนักงานนี้มีวันหยุดในสัปดาห์นี้แล้ว'))
      if (e.message === 'BOOKING_DISABLED') return reply.code(403).send(fail('BOOKING_DISABLED', 'สาขา/กลุ่มของพนักงานนี้ปิดสิทธิ์จองวันหยุด — ส่ง force=true เพื่อยืนยันเพิ่มให้อยู่ดี'))
      if (e.message === 'OVER_QUOTA') return reply.code(400).send(fail('OVER_QUOTA', 'จองวันหยุดครบโควต้าของเดือนนี้แล้ว — ส่ง force=true เพื่อเพิ่มให้อยู่ดี'))
      if (e.message === 'MONTHLY_CAP_EXCEEDED') return reply.code(400).send(fail('MONTHLY_CAP_EXCEEDED', 'รวมวันหยุด + พักร้อนเดือนนี้เกิน 10 วันแล้ว — ส่ง force=true เพื่อเพิ่มให้อยู่ดี'))
      throw e
    }
  })

  // ── Admin/DEPT_HEAD: Approve ─────────────────────────────────────────
  app.post('/admin/weekly-off/:id/approve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติวันหยุดสัปดาห์ (DEPT_HEAD อนุมัติได้แค่คนในแผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          conflict_deduct_type: { type: ['string', 'null'], enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER', null], description: 'ถ้ารายการนี้ has_conflict=true เลือกได้ว่าจะหัก 1 วันจากโควต้าไหน — ไม่ส่ง/null = ไม่หัก' },
        },
      },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, { status: 'APPROVED', reviewed_by: req.userId, conflict_deduct_type: req.body?.conflict_deduct_type }, req.scopedEmployeeIds)
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(result, 'อนุมัติวันหยุดสำเร็จ')
  })

  // ── Admin/DEPT_HEAD: Reject ───────────────────────────────────────────
  app.post('/admin/weekly-off/:id/reject', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'ปฏิเสธวันหยุดสัปดาห์ (DEPT_HEAD ปฏิเสธได้แค่คนในแผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { reject_note: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, { status: 'REJECTED', reviewed_by: req.userId, reject_note: req.body?.reject_note }, req.scopedEmployeeIds)
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

  // ── Admin/DEPT_HEAD: Alert "เช็คอินวันที่จองวันหยุดไว้เอง" ──────────────────
  app.get('/admin/weekly-off/worked-alerts', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'ดูรายชื่อคนที่เช็คอินในวันที่ตัวเองจองวันหยุดไว้เอง (รอ HR resolve — DEPT_HEAD เห็นแค่แผนกที่ดูแล)',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => ok(await listWorkedOnOwnDayOffAlerts(req.tenantId, req.scopedEmployeeIds)))

  // ── Admin/DEPT_HEAD: Resolve alert ───────────────────────────────────
  app.post('/admin/weekly-off/worked-alerts/:id/resolve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'Resolve alert เช็คอินวันหยุดที่จองเอง — เลือก RESCHEDULE (เลื่อนไปจองใหม่) หรือ COMPENSATE (ให้วันชดเชย)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action:          { type: 'string', enum: ['RESCHEDULE', 'COMPENSATE'] },
          note:            { type: 'string' },
          compensate_days: { type: 'integer', minimum: 0, maximum: 5 },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await resolveWorkedOnOwnDayOffAlert(req.tenantId, req.params.id, {
        action: req.body.action, resolvedBy: req.userId, note: req.body.note, compensateDays: req.body.compensate_days,
      }, req.scopedEmployeeIds)
      if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
      return ok(result, req.body.action === 'RESCHEDULE' ? 'ยกเลิกวันหยุดเดิม พนักงานจองวันใหม่ได้แล้ว' : 'ให้วันหยุดชดเชยเรียบร้อย')
    } catch (e: any) {
      if (e.message === 'ALREADY_RESOLVED') return reply.code(409).send(fail('ALREADY_RESOLVED', 'รายการนี้ resolve ไปแล้ว'))
      throw e
    }
  })

  // ── Admin: สลับวันหยุดกันระหว่าง 2 คน ─────────────────────────────────
  app.post('/admin/weekly-off/swap', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'สลับวันหยุดกันระหว่าง 2 คน (แอดมิน/HR ทำให้โดยตรง — mark APPROVED ทั้งคู่ทันที)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_a_off_id', 'employee_b_off_id'],
        properties: {
          employee_a_off_id: { type: 'string' },
          employee_b_off_id: { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await swapWeeklyOff(req.tenantId, {
        employeeAOffId: req.body.employee_a_off_id, employeeBOffId: req.body.employee_b_off_id, swappedBy: req.userId,
      })
      return ok(result, 'สลับวันหยุดสำเร็จ')
    } catch (e: any) {
      if (e.message === 'NOT_FOUND')     return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการวันหยุดที่ระบุ'))
      if (e.message === 'SAME_EMPLOYEE') return reply.code(400).send(fail('SAME_EMPLOYEE', 'ต้องเป็นคนละคนกัน'))
      if (e.message === 'CONFLICT_A' || e.message === 'CONFLICT_B') return reply.code(409).send(fail('CONFLICT', 'มีพนักงานฝั่งใดฝั่งหนึ่งจองวันหยุดสัปดาห์นั้นไว้แล้ว'))
      throw e
    }
  })

  // ── Admin: ดูสถานะการเปิดจองต่อสาขา ─────────────────────────────────────────
  app.get('/admin/weekly-off/periods', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
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
      notifyAdminsLine(req.tenantId, req.body.employee_id, {
        type: 'weekly_off',
        title: 'จองวันหยุดรออนุมัติ',
        detail: `หยุดวัน${DOW_TH[req.body.day_of_week]} สัปดาห์ ${req.body.week_start}`,
        color: '#2563EB',
        // ต้องส่ง month มาด้วยเสมอ ไม่งั้นแอดมินกดจากไลน์แล้วหน้า weekly-off จะโชว์
        // เดือนปัจจุบันตามค่า default เฉยๆ ไม่ใช่เดือนที่พนักงานจองจริง (feedback
        // 2026-09-15: "กดแล้วมันไม่ไปยังหน้านั้นเลย")
        path: `/leave?tab=time-off&month=${req.body.week_start.slice(0, 7)}&focus=${result.id}`,
        buttonLabel: 'เปิดดู',
      })
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดสัปดาห์นี้แล้ว'))
      if (e.message === 'BOOKING_DISABLED') return reply.code(403).send(fail('BOOKING_DISABLED', 'กลุ่มของคุณปิดสิทธิ์จองวันหยุด'))
      if (e.message === 'OVER_QUOTA') return reply.code(400).send(fail('OVER_QUOTA', 'จองวันหยุดครบโควต้าของเดือนนี้แล้ว'))
      if (e.message === 'MONTHLY_CAP_EXCEEDED') return reply.code(400).send(fail('MONTHLY_CAP_EXCEEDED', 'รวมวันหยุด + พักร้อนเดือนนี้เกิน 10 วันแล้ว'))
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
      notifyAdminsLine(req.tenantId, req.body.employee_id, {
        type: 'weekly_off',
        title: 'จองวันหยุดรออนุมัติ',
        detail: `วันหยุดประจำเดือน ${req.body.date}`,
        color: '#2563EB',
        path: `/leave?tab=time-off&month=${req.body.date.slice(0, 7)}&focus=${result.id}`,
        buttonLabel: 'เปิดดู',
      })
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดเดือนนี้แล้ว'))
      if (e.message === 'BOOKING_DISABLED')  return reply.code(403).send(fail('BOOKING_DISABLED', 'สาขาของคุณปิดสิทธิ์จองวันหยุด'))
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
      notifyAdminsLine(req.tenantId, req.body.employee_id, {
        type: 'weekly_off',
        title: 'จองวันหยุดรออนุมัติ',
        detail: `วันหยุดประจำเดือน ${req.body.month} รวม ${(req.body.dates ?? []).length} วัน`,
        color: '#2563EB',
        // เดิมไม่ส่ง month/focus มาเลย — กดจากไลน์แล้วเจอหน้าเดือนปัจจุบัน (ไม่ใช่
        // เดือนที่จอง) ไม่มีวันไหนให้โฟกัส มองเหมือนกดแล้วไม่ไปไหน (feedback 2026-09-15)
        path: `/leave?tab=time-off&month=${req.body.month}&focus=${result[0]?.id ?? ''}`,
        buttonLabel: 'เปิดดู',
      })
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดทั้งเดือนสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดสัปดาห์ใดสัปดาห์หนึ่งในเดือนนี้ไปแล้ว'))
      if (e.message === 'INCOMPLETE_MONTH')  return reply.code(400).send(fail('INCOMPLETE_MONTH', 'ต้องเลือกวันหยุดให้ครบทุกสัปดาห์ของเดือนก่อนส่ง'))
      if (e.message === 'DUPLICATE_WEEK')    return reply.code(400).send(fail('DUPLICATE_WEEK', 'เลือกวันหยุดซ้ำสัปดาห์เดียวกัน'))
      if (e.message === 'DUPLICATE_DATE')    return reply.code(400).send(fail('DUPLICATE_DATE', 'เลือกวันที่ซ้ำกัน'))
      if (e.message === 'OVER_QUOTA')        return reply.code(400).send(fail('OVER_QUOTA', 'เลือกวันหยุดเกินโควต้าจองต่อเดือน'))
      if (e.message === 'BOOKING_DISABLED')  return reply.code(403).send(fail('BOOKING_DISABLED', 'กลุ่มของคุณปิดสิทธิ์จองวันหยุด'))
      if (e.message === 'MONTHLY_CAP_EXCEEDED') return reply.code(400).send(fail('MONTHLY_CAP_EXCEEDED', 'รวมวันหยุด + พักร้อนเดือนนี้เกิน 10 วันแล้ว'))
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

  // ── Employee (LIFF): ยกเลิก/แก้ไขคำขอวันหยุดของตัวเอง ────────────────────
  // PENDING ยกเลิกได้เสมอ — APPROVED ยกเลิกได้ก็ต่อเมื่อช่วงเปิดรับจองของเดือนนั้น
  // ยังเปิดอยู่ (feedback 2026-09-14: เดิมอนุมัติแล้วแก้ไม่ได้เลย)
  app.delete('/employee/weekly-off/:id', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ยกเลิก/แก้ไขคำขอวันหยุด (LIFF) — PENDING ได้เสมอ, APPROVED ได้ถ้าช่วงจองยังเปิด',
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
      if (e.message === 'NOT_PENDING')    return reply.code(409).send(fail('NOT_PENDING', 'ยกเลิกได้เฉพาะรายการที่รอพิจารณา'))
      if (e.message === 'PERIOD_CLOSED')  return reply.code(409).send(fail('PERIOD_CLOSED', 'ช่วงเปิดรับจองของเดือนนี้ปิดแล้ว — แก้ไขไม่ได้'))
      throw e
    }
  })

  // ── Employee (LIFF): ขอสลับวันหยุดกับเพื่อน (self-service) ──────────────
  // สลับได้เฉพาะระหว่างวันหยุดที่ "อนุมัติแล้ว" ทั้งคู่ — ยังไม่สลับจริงตรงนี้
  // แค่ส่งคำขอ + LINE ไปหาเพื่อนให้กดตอบรับก่อน (ดู /respond ด้านล่าง)
  app.post('/employee/weekly-off/swap-requests', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ขอสลับวันหยุดกับเพื่อน (ต้องอนุมัติแล้วทั้งคู่) — ส่ง LINE ไปให้เพื่อนตอบรับ',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'requester_off_id', 'target_off_id'],
        properties: {
          employee_id:      { type: 'string' },
          requester_off_id: { type: 'string' },
          target_off_id:    { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await requestWeeklyOffSwap(req.tenantId, req.body.employee_id, {
        requesterOffId: req.body.requester_off_id, targetOffId: req.body.target_off_id,
      })
      const requesterName = result.requester.nickname ? `${result.requester.first_name} (${result.requester.nickname})` : `${result.requester.first_name} ${result.requester.last_name}`
      const [reqOff, targetOff] = await Promise.all([
        prisma.weeklyOffRequest.findUnique({ where: { id: req.body.requester_off_id } }),
        prisma.weeklyOffRequest.findUnique({ where: { id: req.body.target_off_id } }),
      ])
      if (reqOff && targetOff) {
        notifyEmployeeLine(req.tenantId, result.target_employee_id, requesterName, {
          title: 'ขอสลับวันหยุด',
          detail: `${requesterName} ขอสลับวันหยุด ${resolveActualDateStr(targetOff.week_start, targetOff.day_of_week)} ของคุณ กับวันหยุด ${resolveActualDateStr(reqOff.week_start, reqOff.day_of_week)} ของเขา`,
          color: '#7C3AED',
          path: `/leave?tab=booking&swap=${result.id}`,
          buttonLabel: 'ดูคำขอ',
        })
      }
      return reply.code(201).send(ok(result, 'ส่งคำขอสลับวันหยุดแล้ว รอเพื่อนตอบรับ'))
    } catch (e: any) {
      if (e.message === 'NOT_FOUND')      return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการวันหยุดที่ระบุ'))
      if (e.message === 'SAME_EMPLOYEE')  return reply.code(400).send(fail('SAME_EMPLOYEE', 'ต้องเป็นคนละคนกัน'))
      if (e.message === 'NOT_APPROVED')   return reply.code(400).send(fail('NOT_APPROVED', 'สลับได้เฉพาะวันหยุดที่อนุมัติแล้วทั้งคู่'))
      if (e.message === 'ALREADY_PENDING') return reply.code(409).send(fail('ALREADY_PENDING', 'มีคำขอสลับที่รอตอบรับผูกกับวันนี้อยู่แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): ดูคำขอสลับที่เกี่ยวกับตัวเอง (ขอไป/มีคนขอมา) ────────
  app.get('/employee/weekly-off/swap-requests', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูคำขอสลับวันหยุดที่เกี่ยวกับตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['employeeId'], properties: { employeeId: { type: 'string' } } },
    },
  }, async (req: any) => {
    return ok(await listMyWeeklyOffSwapRequests(req.tenantId, req.query.employeeId))
  })

  // ── Employee (LIFF): ตอบรับ/ปฏิเสธคำขอสลับ ───────────────────────────────
  app.post('/employee/weekly-off/swap-requests/:id/respond', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ตอบรับ/ปฏิเสธคำขอสลับวันหยุด — ยอมรับ = สลับจริงทันที + แจ้ง LINE ผู้ขอ/แอดมิน',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['employee_id', 'accept'],
        properties: { employee_id: { type: 'string' }, accept: { type: 'boolean' } },
      },
    },
  }, async (req: any, reply) => {
    try {
      const { swapReq, swapped } = await respondWeeklyOffSwap(req.tenantId, req.params.id, req.body.employee_id, req.body.accept)
      const requesterName = swapReq.requester.nickname ? `${swapReq.requester.first_name} (${swapReq.requester.nickname})` : `${swapReq.requester.first_name} ${swapReq.requester.last_name}`
      const targetName    = swapReq.target.nickname    ? `${swapReq.target.first_name} (${swapReq.target.nickname})`       : `${swapReq.target.first_name} ${swapReq.target.last_name}`

      if (req.body.accept && swapped) {
        const newReqDate    = resolveActualDateStr(swapped.a.week_start, swapped.a.day_of_week)
        const newTargetDate = resolveActualDateStr(swapped.b.week_start, swapped.b.day_of_week)
        notifyEmployeeLine(req.tenantId, swapReq.requester_employee_id, targetName, {
          title: 'เพื่อนยอมรับคำขอสลับแล้ว',
          detail: `${targetName} ยอมรับการสลับวันหยุดแล้ว — ตอนนี้คุณหยุดวันที่ ${newReqDate} แทน`,
          color: '#16A34A',
        })
        notifyAdminsLine(req.tenantId, swapReq.requester_employee_id, {
          type: 'weekly_off_swap',
          title: 'พนักงานสลับวันหยุดกันเอง',
          detail: `${requesterName} ↔ ${targetName}: ${requesterName} เปลี่ยนไปหยุด ${newReqDate}, ${targetName} เปลี่ยนไปหยุด ${newTargetDate}`,
          color: '#7C3AED',
          path: `/leave?tab=time-off&month=${newReqDate.slice(0, 7)}&focus=${swapped.a.id}`,
          buttonLabel: 'เปิดดู',
        })
      } else if (!req.body.accept) {
        notifyEmployeeLine(req.tenantId, swapReq.requester_employee_id, targetName, {
          title: 'เพื่อนปฏิเสธคำขอสลับ',
          detail: `${targetName} ไม่สะดวกสลับวันหยุดกับคุณ`,
          color: '#DC2626',
        })
      }

      return ok(null, req.body.accept ? 'สลับวันหยุดสำเร็จ' : 'ปฏิเสธคำขอแล้ว')
    } catch (e: any) {
      if (e.message === 'NOT_FOUND')    return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ'))
      if (e.message === 'NOT_PENDING')  return reply.code(409).send(fail('NOT_PENDING', 'คำขอนี้ถูกตอบไปแล้ว'))
      if (e.message === 'NOT_APPROVED') return reply.code(409).send(fail('NOT_APPROVED', 'วันหยุดฝั่งใดฝั่งหนึ่งไม่ใช่สถานะอนุมัติแล้ว — สลับไม่ได้'))
      if (e.message === 'CONFLICT_A' || e.message === 'CONFLICT_B') return reply.code(409).send(fail('CONFLICT', 'มีฝั่งใดฝั่งหนึ่งจองวันหยุดสัปดาห์นั้นซ้อนอยู่แล้ว'))
      throw e
    }
  })
}
