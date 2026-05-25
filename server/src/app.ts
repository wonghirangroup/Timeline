// server/src/app.ts
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

import { authRoutes }       from './modules/auth/auth.route'
import { tenantRoutes }     from './modules/tenant/tenant.route'
import { branchRoutes }     from './modules/branch/branch.route'
import { employeeRoutes }   from './modules/employee/employee.route'
import { shiftRoutes }      from './modules/shift/shift.route'
import { attendanceRoutes } from './modules/attendance/attendance.route'
import { leaveRoutes }      from './modules/leave/leave.route'
import { otRoutes }         from './modules/ot/ot.route'
import { lineRoutes }       from './modules/line/line.route'
import { announcementRoutes } from './modules/announcement/announcement.route'

const app = Fastify({ logger: process.env.NODE_ENV === 'development' })

// ── Plugins ──────────────────────────────────────────────────────
app.register(cors, {
  origin: [
    process.env.CORS_ADMIN_URL!,
    process.env.CORS_SUPERADMIN_URL!,
    process.env.CORS_EMPLOYEE_URL!,
  ],
  credentials: true,
})

app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET! })
app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB

// ── Health ────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────────
app.register(authRoutes,         { prefix: '/api/v1/auth' })
app.register(tenantRoutes,       { prefix: '/api/v1/super-admin' })  // SUPER_ADMIN
app.register(branchRoutes,       { prefix: '/api/v1/admin' })        // ADMIN
app.register(employeeRoutes,     { prefix: '/api/v1/admin' })        // ADMIN
app.register(shiftRoutes,        { prefix: '/api/v1/admin' })        // ADMIN
app.register(attendanceRoutes,   { prefix: '/api/v1' })              // MANAGER read + EMPLOYEE write (LIFF)
app.register(leaveRoutes,        { prefix: '/api/v1' })              // MANAGER approve + EMPLOYEE request (LIFF)
app.register(otRoutes,           { prefix: '/api/v1' })              // MANAGER approve + EMPLOYEE request (LIFF)
app.register(announcementRoutes, { prefix: '/api/v1/admin' })        // ADMIN broadcast
app.register(lineRoutes,         { prefix: '/api/v1/line' })         // Line webhook

// ── Start ─────────────────────────────────────────────────────────
const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
    console.log(`🚀 TimeLine Server → http://localhost:${process.env.PORT || 3000}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
