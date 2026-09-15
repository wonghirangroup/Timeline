// server/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
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

// ── Magic login (auto-login ทางเดียว) ───────────────────────────────────────
// feedback 2026-09-15: กดจากแจ้งเตือนไลน์/ปุ่ม "สลับไปเว็บแอดมิน" อยากล็อกอินอัตโนมัติ
// ใช้ครั้งเดียวหมดอายุเร็ว (2 นาที) กันแชร์ลิงก์/เปิดซ้ำ — ไม่ใช่ JWT เพราะต้อง track
// การใช้งานแบบ single-use จริง (JWT ล้วนๆ stateless เช็คซ้ำไม่ได้)
const MAGIC_TOKEN_TTL_MS = 2 * 60 * 1000

export async function createMagicLoginToken(userId: string, nextPath?: string | null) {
  const token = crypto.randomBytes(24).toString('hex')
  await prisma.magicLoginToken.create({
    data: { token, user_id: userId, next_path: nextPath ?? null, expires_at: new Date(Date.now() + MAGIC_TOKEN_TTL_MS) },
  })
  return token
}

// claim แบบ atomic ผ่าน updateMany (where used_at: null) กัน race ถ้ากดลิงก์ซ้ำไล่ๆ กัน
export async function consumeMagicLoginToken(token: string) {
  const row = await prisma.magicLoginToken.findUnique({ where: { token } })
  if (!row || row.used_at || row.expires_at < new Date()) return null

  const claim = await prisma.magicLoginToken.updateMany({
    where: { id: row.id, used_at: null },
    data: { used_at: new Date() },
  })
  if (claim.count === 0) return null // คนอื่นชิงใช้ไปแล้วในเสี้ยววินาทีเดียวกัน

  const user = await prisma.user.findFirst({
    where: { id: row.user_id, is_active: true, deleted_at: null },
    include: { tenant: { select: { enabled_features: true } } },
  })
  if (!user) return null
  return { user, next_path: row.next_path }
}
