// server/src/app.ts
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import formbody from '@fastify/formbody'

import { authRoutes }         from './modules/auth/auth.route'
import { tenantRoutes }       from './modules/tenant/tenant.route'
import { branchRoutes }       from './modules/branch/branch.route'
import { employeeRoutes }     from './modules/employee/employee.route'
import { employeeAuthRoutes } from './modules/employee/employee-auth.route'
import { employeeMeRoutes }   from './modules/employee/employee-me.route'
import { shiftRoutes }        from './modules/shift/shift.route'
import { attendanceRoutes }   from './modules/attendance/attendance.route'
import { leaveRoutes }        from './modules/leave/leave.route'
import { otRoutes }           from './modules/ot/ot.route'
import { lineRoutes }         from './modules/line/line.route'
import { announcementRoutes } from './modules/announcement/announcement.route'

const app = Fastify({
  logger: process.env.NODE_ENV === 'development',
  ajv: {
    customOptions: {
      strict: 'log',       // warn แทน error สำหรับ unknown keywords
      keywords: ['example'], // รับ 'example' keyword จาก OpenAPI
    },
  },
})

// ── Swagger ───────────────────────────────────────────────────────
app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'TimeLine HR API',
      description: 'HR Attendance & Leave Management System — Multi-tenant SaaS',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        oauth2: {
          type: 'oauth2',
          flows: {
            password: {
              tokenUrl: '/api/v1/auth/token',
              scopes: {},
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { oauth2: [] }],
    tags: [
      { name: 'Auth',        description: 'Login / Refresh token / Me' },
      { name: 'Super Admin', description: 'จัดการ Tenant (SUPER_ADMIN เท่านั้น)' },
      { name: 'Admin',       description: 'Branch / Employee / Shift / Announcement (ADMIN)' },
      { name: 'Manager',     description: 'Attendance / Leave approval (MANAGER)' },
      { name: 'Employee',    description: 'Check-in / Leave request via LIFF (EMPLOYEE)' },
      { name: 'Line',        description: 'Line Webhook' },
    ],
  },
})

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    persistAuthorization: true,
  },
})

// ── Plugins ───────────────────────────────────────────────────────
// Parse comma-separated origins from env or use defaults
const corsOrigins = [
  process.env.CORS_ADMIN_URL,
  process.env.CORS_SUPERADMIN_URL,
  process.env.CORS_EMPLOYEE_URL,
].filter(Boolean) as string[]

app.register(cors, {
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
})

app.register(formbody)   // รับ application/x-www-form-urlencoded (OAuth2 token endpoint)
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
app.register(employeeAuthRoutes,  { prefix: '/api/v1' })              // LIFF auth (no JWT required)
app.register(employeeMeRoutes,   { prefix: '/api/v1' })              // LIFF: employee profile + shifts
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
