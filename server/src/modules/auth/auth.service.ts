// server/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { User } from '@prisma/client'
import { prisma } from '../../common/utils/prisma'

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function createAccessToken(app: FastifyInstance, user: User) {
  return app.jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    },
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    },
  )
}

export function createRefreshToken(app: FastifyInstance, user: User) {
  return app.jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    },
    {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    },
  )
}

export async function verifyRefreshToken(app: FastifyInstance, token: string) {
  return app.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET! }) as { id: string; email: string; role: string; tenant_id: string | null }
}
