// server/src/modules/auth/auth.route.ts
import { FastifyInstance } from 'fastify'
import { loginSchema, refreshSchema } from './auth.schema'
import {
  findUserByEmail,
  findUserByUsername,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  findUserById,
} from './auth.service'

export async function authRoutes(app: FastifyInstance) {

  // ── OAuth2 Password Flow (สำหรับ Swagger UI Authorize) ────────────
  app.post('/token', {
    schema: {
      tags: ['Auth'],
      summary: 'OAuth2 Password Flow — ใช้กับปุ่ม Authorize ใน Swagger',
      security: [],
      consumes: ['application/x-www-form-urlencoded'],
    },
  }, async (request: any, reply) => {
    const { username, password } = request.body
    const user = await findUserByEmail(username)
    if (!user || !user.is_active || !(await verifyPassword(password, user.password))) {
      reply.code(401)
      return { error: 'invalid_client', error_description: 'Invalid credentials' }
    }
    const access_token = createAccessToken(app, user)
    return { access_token, token_type: 'bearer', expires_in: 900 }
  })

  app.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login ด้วย Username + Password',
      security: [],
      body: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken:  { type: 'string' },
                refreshToken: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id:        { type: 'string' },
                    email:     { type: 'string' },
                    role:      { type: 'string' },
                    tenant_id: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: any, reply) => {
    const body = request.body ?? {}
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'กรุณากรอก username และ password' } }
    }

    const { username, password } = parsed.data
    const user = await findUserByUsername(username)
    if (!user || !user.is_active) {
      reply.code(401)
      return { success: false, error: { code: 'AUTH_FAILED', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const validPassword = await verifyPassword(password, user.password)
    if (!validPassword) {
      reply.code(401)
      return { success: false, error: { code: 'AUTH_FAILED', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const accessToken = createAccessToken(app, user)
    const refreshToken = createRefreshToken(app, user)

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          tenant_id: user.tenant_id,
        },
        accessToken,
        refreshToken,
      },
    }
  })

  app.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'ขอ Access Token ใหม่ด้วย Refresh Token',
      security: [],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request: any, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_PAYLOAD', message: parsed.error.message } }
    }

    try {
      const payload = await verifyRefreshToken(app, parsed.data.refreshToken)
      const user = await findUserById(payload.id)
      if (!user || !user.is_active) {
        reply.code(401)
        return { success: false, error: { code: 'AUTH_FAILED', message: 'Invalid token' } }
      }
      const accessToken = createAccessToken(app, user)
      return { success: true, data: { accessToken } }
    } catch (error: any) {
      reply.code(401)
      return { success: false, error: { code: 'AUTH_FAILED', message: error?.message || 'Invalid token' } }
    }
  })

  app.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'ดูข้อมูล user ปัจจุบัน (ต้องมี Bearer Token)',
    },
  }, async (request: any, reply) => {
    try {
      await request.jwtVerify()
      return { success: true, data: request.user }
    } catch (err) {
      reply.code(401)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }
    }
  })
}
