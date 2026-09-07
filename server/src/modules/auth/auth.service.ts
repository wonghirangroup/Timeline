// server/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { FastifyInstance } from 'fastify'
import type { User } from '@prisma/client'
import { prisma } from '../../common/utils/prisma'

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { email: username },
    include: { tenant: { select: { enabled_features: true } } },
  })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

// เปลี่ยนรหัสผ่านของตัวเอง — ต้องยืนยันรหัสเดิมก่อน
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('NOT_FOUND')
  if (!(await bcrypt.compare(currentPassword, user.password))) throw new Error('WRONG_PASSWORD')
  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10), must_change_password: false } })
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
