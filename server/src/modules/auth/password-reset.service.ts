// server/src/modules/auth/password-reset.service.ts
// ลืมรหัสผ่านด้วย OTP ทางอีเมล: ขอ OTP → กรอก OTP + รหัสใหม่
// ความปลอดภัย: ตอบเหมือนกันเสมอไม่ว่าบัญชีมีหรือไม่ (กันเดาว่าอีเมลไหนอยู่ในระบบ) · OTP เก็บเป็น bcrypt hash · อายุ 10 นาที ·
// ผิดได้ 5 ครั้งแล้วโค้ดนั้นตาย · ขอใหม่ได้ทุก 60 วินาที และไม่เกิน 5 ครั้ง/ชั่วโมง/บัญชี · ใช้ได้ครั้งเดียว
import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../common/utils/prisma'
import { sendEmail, isEmailConfigured } from '../../common/utils/email'

export const OTP_TTL_MIN = 10
export const OTP_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_SEC = 60
const MAX_PER_HOUR = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isEmailLike = (s: string | null | undefined): s is string => !!s && EMAIL_RE.test(s)
/** ทำความสะอาดอีเมลที่ผู้ใช้กรอก: ว่าง → null · รูปแบบผิด → throw INVALID_EMAIL */
export function normalizeRecoveryEmail(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  if (s.length > 191 || !EMAIL_RE.test(s)) throw new Error('INVALID_EMAIL')
  return s
}

/**
 * หาบัญชีจากสิ่งที่ผู้ใช้กรอกในหน้าลืมรหัสผ่าน: ชื่อผู้ใช้ (email ที่ใช้ล็อกอิน) หรือ "อีเมลสำหรับกู้รหัสผ่าน" ที่ผูกไว้
 * ถ้าอีเมลกู้รหัสตรงกับหลายบัญชี (คนเดียวมีหลายบัญชี) → ไม่เลือกให้ ป้องกันส่งรหัสของบัญชีผิด
 */
async function findResetUser(identifier: string) {
  const id = identifier.trim().toLowerCase()
  if (!id) return null
  const byUsername = await prisma.user.findFirst({ where: { email: id, is_active: true, deleted_at: null } })
  if (byUsername) return byUsername
  if (!isEmailLike(id)) return null
  const byRecovery = await prisma.user.findMany({ where: { recovery_email: id, is_active: true, deleted_at: null }, take: 2 })
  return byRecovery.length === 1 ? byRecovery[0] : null
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function otpEmail(otp: string, name: string) {
  const subject = `รหัส OTP สำหรับตั้งรหัสผ่านใหม่ (YooNai) — ${otp}`
  const html = `<div style="font-family:Arial,'Noto Sans Thai',sans-serif;max-width:480px;margin:auto;padding:24px;color:#0B1B4D">
  <h2 style="margin:0 0 8px">ตั้งรหัสผ่านใหม่</h2>
  <p style="margin:0 0 16px;color:#475569">สวัสดี ${name} — ใช้รหัส OTP ด้านล่างเพื่อตั้งรหัสผ่านใหม่ รหัสนี้ใช้ได้ ${OTP_TTL_MIN} นาที</p>
  <div style="font-size:34px;letter-spacing:10px;font-weight:800;background:#EAF2FF;border-radius:14px;padding:16px 0;text-align:center;color:#1D4ED8">${otp}</div>
  <p style="margin:16px 0 0;color:#64748B;font-size:13px">ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร และไม่ควรบอกรหัสนี้กับใคร ทีมงานไม่เคยขอ OTP จากคุณ</p>
</div>`
  const text = `รหัส OTP ตั้งรหัสผ่านใหม่ของคุณคือ ${otp} (ใช้ได้ ${OTP_TTL_MIN} นาที) — ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร`
  return { subject, html, text }
}

/** ขอ OTP — คืนค่าเดิมเสมอ (ไม่บอกว่ามีบัญชีหรือไม่) */
export async function requestPasswordResetOtp(identifier: string): Promise<{ configured: boolean }> {
  const configured = isEmailConfigured()
  if (!configured) return { configured }

  const user = await findResetUser(identifier)
  if (!user) return { configured }
  // ส่งไปที่อีเมลกู้รหัสผ่านที่ผูกไว้ · ไม่มี → ใช้ชื่อผู้ใช้ถ้าเป็นอีเมลจริง · ไม่มีเลย → ไม่ส่ง (ตอบเหมือนเดิม ไม่บอกว่าเพราะอะไร)
  const dest = user.recovery_email || (isEmailLike(user.email) ? user.email : null)
  if (!dest) return { configured }

  const now = Date.now()
  const recent = await prisma.passwordResetOtp.findMany({
    where: { user_id: user.id, created_at: { gte: new Date(now - 3600_000) } },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  })
  if (recent.length >= MAX_PER_HOUR) return { configured }
  if (recent[0] && now - recent[0].created_at.getTime() < RESEND_COOLDOWN_SEC * 1000) return { configured }

  const otp = generateOtp()
  // โค้ดเก่าที่ยังไม่ใช้ตายทั้งหมด — มีโค้ดที่ใช้ได้แค่ตัวล่าสุดตัวเดียว
  await prisma.passwordResetOtp.updateMany({ where: { user_id: user.id, used_at: null }, data: { used_at: new Date() } })
  await prisma.passwordResetOtp.create({
    data: { user_id: user.id, otp_hash: await bcrypt.hash(otp, 8), expires_at: new Date(now + OTP_TTL_MIN * 60_000) },
  })
  await sendEmail({ to: dest, ...otpEmail(otp, user.first_name || user.email) })
  return { configured }
}

/** ตรวจ OTP แล้วตั้งรหัสใหม่ — throw INVALID_OTP เมื่อโค้ดผิด/หมดอายุ/ใช้แล้ว/ลองเกิน */
export async function resetPasswordWithOtp(identifier: string, otp: string, newPassword: string): Promise<void> {
  const user = await findResetUser(identifier)
  if (!user) throw new Error('INVALID_OTP')

  const rec = await prisma.passwordResetOtp.findFirst({
    where: { user_id: user.id, used_at: null, expires_at: { gt: new Date() } },
    orderBy: { created_at: 'desc' },
  })
  if (!rec || rec.attempts >= OTP_MAX_ATTEMPTS) throw new Error('INVALID_OTP')

  const okOtp = await bcrypt.compare(otp, rec.otp_hash)
  if (!okOtp) {
    await prisma.passwordResetOtp.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } })
    throw new Error('INVALID_OTP')
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10), must_change_password: false } }),
    prisma.passwordResetOtp.updateMany({ where: { user_id: user.id, used_at: null }, data: { used_at: new Date() } }),
  ])
}
