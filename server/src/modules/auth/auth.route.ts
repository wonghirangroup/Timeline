// server/src/modules/auth/auth.route.ts
import { FastifyInstance } from 'fastify'
import { loginSchema, refreshSchema } from './auth.schema'
import {
  findUserByEmail,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  findUserById,
} from './auth.service'

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request: any, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_PAYLOAD', message: parsed.error.message } }
    }

    const { email, password } = parsed.data
    const user = await findUserByEmail(email)
    if (!user || !user.is_active) {
      reply.code(401)
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Invalid credentials' } }
    }

    const validPassword = await verifyPassword(password, user.password)
    if (!validPassword) {
      reply.code(401)
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Invalid credentials' } }
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

  app.post('/refresh', async (request: any, reply) => {
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

  app.get('/me', async (request: any, reply) => {
    try {
      await request.jwtVerify()
      return { success: true, data: request.user }
    } catch (err) {
      reply.code(401)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }
    }
  })
}
