// server/src/modules/attendance/attendance.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { prisma }           from '../../common/utils/prisma'
import {
  getAttendanceReport, createManualAttendance, updateAttendanceTime,
  checkIn, checkInQR, checkInAuto, checkInScan, checkOut, checkOutAuto, checkOutScan, getTodayAttendance, getEmployeeHistory,
} from './attendance.service'
import { verifyBranchQrPayload } from '../shift/shift.service'

export async function attendanceRoutes(app: FastifyInstance) {

  // ── Admin: รายงานเช็คชื่อ ─────────────────────────────────────────
  app.get('/admin/attendance', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'รายงานการเช็คชื่อ (กรอง date / branchId / employeeId ได้)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          date:       { type: 'string', description: 'YYYY-MM-DD (วันเดียว)' },
          startDate:  { type: 'string', description: 'YYYY-MM-DD (ช่วงเริ่ม)' },
          endDate:    { type: 'string', description: 'YYYY-MM-DD (ช่วงสิ้นสุด)' },
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
        },
      },
    },
  }, async (req: any) => {
    const records = await getAttendanceReport(req.tenantId, {
      date:       req.query.date,
      startDate:  req.query.startDate,
      endDate:    req.query.endDate,
      branchId:   req.query.branchId,
      employeeId: req.query.employeeId,
    })
    return ok(records)
  })

  // ── Admin: ลงเวลาแทนพนักงาน (manual) ────────────────────────────
  app.post('/admin/attendance', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'Admin ลงเวลาแทนพนักงาน',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id', 'date'],
        properties: {
          employee_id:  { type: 'string' },
          shift_id:     { type: 'string' },
          date:         { type: 'string', description: 'YYYY-MM-DD' },
          check_in_at:  { type: 'string', description: 'HH:mm' },
          check_out_at: { type: 'string', description: 'HH:mm' },
          note:         { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await createManualAttendance(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'ลงเวลาสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_CHECKED_IN' || e.code === 'P2002') {
        return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'พนักงานนี้มีบันทึกในกะนี้แล้ว'))
      }
      throw e
    }
  })

  // ── Admin: แก้ไขเวลาเช็คอิน/เช็คเอาต์ ───────────────────────────
  app.patch('/admin/attendance/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'แก้ไขเวลาเช็คอิน/เช็คเอาต์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          check_in_at:  { type: 'string', description: 'HH:mm' },
          check_out_at: { type: 'string', description: 'HH:mm' },
          note:         { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const record = await updateAttendanceTime(req.tenantId, req.params.id, req.body)
    if (!record) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบันทึก'))
    return ok(record, 'แก้ไขเวลาสำเร็จ')
  })

  // ── Admin: Reset (ลบ) บันทึกเช็คชื่อ ────────────────────────────────
  app.delete('/admin/attendance/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ลบบันทึกเช็คชื่อ (reset เป็นค่าว่าง)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const record = await prisma.attendanceRecord.findFirst({
      where: { id: req.params.id, tenant_id: req.tenantId },
    })
    if (!record) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบันทึก'))
    await prisma.attendanceRecord.delete({ where: { id: req.params.id } })
    return ok(null, 'ลบบันทึกสำเร็จ')
  })

  // ── Employee (LIFF): ดูข้อมูล shift ก่อน confirm check-in ─────────
  app.get('/employee/shift-preview', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูชื่อ/เวลา shift + branch สำหรับแสดงใน confirm screen',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['shift_id', 'branch_id'],
        properties: {
          shift_id:  { type: 'string' },
          branch_id: { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const shift = await prisma.shift.findFirst({
      where: { id: req.query.shift_id, tenant_id: req.tenantId, deleted_at: null },
      include: { branch: { select: { id: true, name: true } } },
    })
    if (!shift) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกะ'))
    return ok({
      name:        shift.name,
      start_time:  shift.start_time,
      end_time:    shift.end_time,
      branch_name: shift.branch.name,
    })
  })

  // ── Employee (LIFF): Check-in ─────────────────────────────────────
  app.post('/employee/attendance/check-in', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คอิน (LIFF only)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id'],
        properties: {
          employee_id: { type: 'string' },
          shift_id:    { type: 'string' },
          branch_id:   { type: 'string' },
          gps_lat:     { type: 'number' },
          gps_lng:     { type: 'number' },
          note:        { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await checkIn(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'เช็คอินสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_CHECKED_IN') return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'เช็คอินในกะนี้แล้ว'))
      if (e.message === 'OUTSIDE_GEOFENCE')   return reply.code(403).send(fail('OUTSIDE_GEOFENCE', 'คุณอยู่นอกพื้นที่ สาขานี้บล็อคการเช็คอินนอกพื้นที่'))
      throw e
    }
  })

  // ── Employee (LIFF): Check-in ด้วย QR Scan (signed payload) ────
  app.post('/employee/attendance/check-in-scan', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คอินด้วย QR Code scan — verify HMAC signature + check-in',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'qr_payload'],
        properties: {
          employee_id: { type: 'string' },
          qr_payload:  { type: 'string', description: 'JSON string จาก QR Code' },
          gps_lat:     { type: 'number' },
          gps_lng:     { type: 'number' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      let payload: any
      try { payload = JSON.parse(req.body.qr_payload) } catch {
        return reply.code(400).send(fail('INVALID_QR', 'QR Code ไม่ถูกต้อง'))
      }

      // ตรวจว่า tenant ตรงกัน
      if (payload.tid !== req.tenantId) {
        return reply.code(403).send(fail('INVALID_QR', 'QR Code ไม่ใช่ของ tenant นี้'))
      }

      // Verify HMAC signature (branch-level — ถาวร ไม่มีวันหมดอายุ)
      if (!verifyBranchQrPayload(payload)) {
        return reply.code(400).send(fail('INVALID_QR_SIG', 'QR Code ไม่ถูกต้องหรือถูกดัดแปลง'))
      }

      // Branch QR → auto-detect กะจากเวลา
      const result = await checkInAuto(req.tenantId, {
        employee_id: req.body.employee_id,
        branch_id:   payload.bid,
        gps_lat:     req.body.gps_lat,
        gps_lng:     req.body.gps_lng,
      })
      return reply.code(201).send(ok(result, 'เช็คอินสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_CHECKED_IN' || e.code === 'P2002') return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'เช็คอินในกะนี้แล้ว'))
      if (e.message === 'OUTSIDE_GEOFENCE')   return reply.code(403).send(fail('OUTSIDE_GEOFENCE', 'คุณอยู่นอกพื้นที่สาขา'))
      if (e.message === 'BRANCH_NOT_FOUND')   return reply.code(404).send(fail('BRANCH_NOT_FOUND', 'ไม่พบสาขา'))
      if (e.message === 'NOT_IN_BRANCH')      return reply.code(403).send(fail('NOT_IN_BRANCH', 'คุณไม่ได้สังกัดสาขานี้ — ไม่สามารถเช็คอินได้'))
      if (e.message === 'EMPLOYEE_NOT_FOUND') return reply.code(404).send(fail('EMPLOYEE_NOT_FOUND', 'ไม่พบข้อมูลพนักงาน'))
      if (e.message === 'SHIFT_NOT_IN_TIME')  return reply.code(400).send(fail('SHIFT_NOT_IN_TIME', 'ยังไม่ถึงเวลาเช็คอินกะนี้'))
      if (e.message === 'NO_SHIFT_AVAILABLE') return reply.code(404).send(fail('NO_SHIFT_AVAILABLE', 'ไม่มีกะงานที่กำหนดไว้สำหรับสาขานี้'))
      throw e
    }
  })

  // ── Employee (LIFF): Auto check-in จาก QR (branchId เท่านั้น) ───
  app.post('/employee/attendance/check-in-auto', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'Auto check-in — ระบบ detect กะจากเวลาปัจจุบัน (QR scan)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'branch_id'],
        properties: {
          employee_id: { type: 'string' },
          branch_id:   { type: 'string' },
          gps_lat:     { type: 'number' },
          gps_lng:     { type: 'number' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await checkInAuto(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'เช็คอินสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'NO_SHIFT_AVAILABLE') return reply.code(400).send(fail('NO_SHIFT_AVAILABLE', 'ไม่มีกะที่เปิดรับเช็คอินในเวลานี้ — อาจเลยเวลาที่กำหนดแล้ว'))
      if (e.message === 'OUTSIDE_GEOFENCE')   return reply.code(403).send(fail('OUTSIDE_GEOFENCE', 'คุณอยู่นอกพื้นที่สาขา'))
      if (e.message === 'BRANCH_NOT_FOUND')   return reply.code(404).send(fail('BRANCH_NOT_FOUND', 'ไม่พบสาขา'))
      if (e.code === 'P2002')                 return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'เช็คอินในกะนี้แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): Check-in ด้วย QR (BLOCK mode) ──────────────
  app.post('/employee/attendance/check-in-qr', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คอินด้วย QR scan — ต้องอยู่ในพื้นที่เท่านั้น',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id', 'branch_id', 'gps_lat', 'gps_lng'],
        properties: {
          employee_id: { type: 'string' },
          shift_id:    { type: 'string' },
          branch_id:   { type: 'string' },
          gps_lat:     { type: 'number' },
          gps_lng:     { type: 'number' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await checkInQR(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'เช็คอินสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'OUTSIDE_GEOFENCE')   return reply.code(403).send(fail('OUTSIDE_GEOFENCE', 'คุณอยู่นอกพื้นที่ — QR นี้ใช้ได้เฉพาะในสาขา'))
      if (e.message === 'ALREADY_CHECKED_IN') return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'เช็คอินในกะนี้แล้ว'))
      if (e.message === 'BRANCH_NOT_FOUND')   return reply.code(404).send(fail('BRANCH_NOT_FOUND', 'ไม่พบสาขา'))
      throw e
    }
  })

  // ── Employee (LIFF): Check-out ด้วย QR Scan ─────────────────────────
  app.post('/employee/attendance/check-out-scan', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คเอาต์ด้วย QR Code scan — verify HMAC signature + check-out',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'qr_payload'],
        properties: {
          employee_id: { type: 'string' },
          qr_payload:  { type: 'string', description: 'JSON string จาก QR Code (เดิมกับที่ใช้เช็คอิน)' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      let payload: any
      try { payload = JSON.parse(req.body.qr_payload) } catch {
        return reply.code(400).send(fail('INVALID_QR', 'QR Code ไม่ถูกต้อง'))
      }

      if (payload.tid !== req.tenantId) {
        return reply.code(403).send(fail('INVALID_QR', 'QR Code ไม่ใช่ของ tenant นี้'))
      }

      if (!verifyBranchQrPayload(payload)) {
        return reply.code(400).send(fail('INVALID_QR_SIG', 'QR Code ไม่ถูกต้องหรือถูกดัดแปลง'))
      }

      const result = await checkOutScan(req.tenantId, req.body.employee_id, payload.bid)
      return ok(result, 'เช็คเอาต์สำเร็จ')
    } catch (e: any) {
      if (e.message === 'NOT_CHECKED_IN')      return reply.code(400).send(fail('NOT_CHECKED_IN', 'ยังไม่ได้เช็คอินวันนี้'))
      if (e.message === 'ALREADY_CHECKED_OUT') return reply.code(409).send(fail('ALREADY_CHECKED_OUT', 'เช็คเอาต์แล้ว'))
      if (e.message?.startsWith('TOO_EARLY:')) {
        const time = e.message.split(':')[1]
        return reply.code(400).send(fail('TOO_EARLY', `ยังเช็คเอาต์ไม่ได้ — เช็คเอาต์ได้หลัง ${time} น.`))
      }
      throw e
    }
  })

  // ── Employee (LIFF): บันทึกวันนี้ ───────────────────────────────────
  app.get('/employee/attendance/today', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูบันทึกเช็คชื่อวันนี้ของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['employeeId'], properties: { employeeId: { type: 'string' } } },
    },
  }, async (req: any) => {
    const records = await getTodayAttendance(req.tenantId, req.query.employeeId)
    return ok(records)
  })

  // ── Employee (LIFF): Check-out Auto ──────────────────────────────
  app.post('/employee/attendance/check-out-auto', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คเอาต์อัตโนมัติ — หากะที่ยังไม่เช็คเอาต์วันนี้ (LIFF)',
      security: [{ oauth2: [] }],
      body: { type: 'object', required: ['employee_id'], properties: { employee_id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      const result = await checkOutAuto(req.tenantId, req.body.employee_id)
      return ok(result, 'เช็คเอาต์สำเร็จ')
    } catch (e: any) {
      if (e.message === 'NOT_CHECKED_IN')      return reply.code(400).send(fail('NOT_CHECKED_IN', 'ยังไม่ได้เช็คอินวันนี้'))
      if (e.message === 'ALREADY_CHECKED_OUT') return reply.code(409).send(fail('ALREADY_CHECKED_OUT', 'เช็คเอาต์แล้ว'))
      if (e.message?.startsWith('TOO_EARLY:')) {
        const time = e.message.split(':')[1]
        return reply.code(400).send(fail('TOO_EARLY', `ยังเช็คเอาต์ไม่ได้ — เช็คเอาต์ได้หลัง ${time} น.`))
      }
      throw e
    }
  })

  // ── Employee (LIFF): Check-out ────────────────────────────────────
  app.post('/employee/attendance/check-out', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คเอาต์ (LIFF only)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id'],
        properties: {
          employee_id: { type: 'string' },
          shift_id:    { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await checkOut(req.tenantId, req.body)
      return ok(record, 'เช็คเอาต์สำเร็จ')
    } catch (e: any) {
      if (e.message === 'NOT_CHECKED_IN')      return reply.code(400).send(fail('NOT_CHECKED_IN', 'ยังไม่ได้เช็คอินในกะนี้'))
      if (e.message === 'ALREADY_CHECKED_OUT') return reply.code(409).send(fail('ALREADY_CHECKED_OUT', 'เช็คเอาต์แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): ประวัติของตัวเอง ────────────────────────────
  app.get('/employee/attendance/history', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ประวัติการเช็คชื่อ 30 วันล่าสุด (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const history = await getEmployeeHistory(req.tenantId, req.query.employeeId)
    return ok(history)
  })
}
