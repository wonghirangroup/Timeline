// server/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
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

export function createRefreshToken(_app: FastifyInstance, user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as any },
  )
}

export async function verifyRefreshToken(_app: FastifyInstance, token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
    id: string
    email: string
    role: string
    tenant_id: string | null
  }
}
