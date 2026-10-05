// server/src/common/utils/adminActivity.ts
// บันทึก "การกดที่เปลี่ยนข้อมูล" ของแอดมินแต่ละคน — เพิ่ม/แก้ไข/ลบ/อนุมัติ/ลงวันลา-วันหยุด ฯลฯ (POST/PUT/PATCH/DELETE) (feedback 2026-10-05
// "เอาแค่นี้ดีกว่า เพิ่มลบแก้ไข หรือกดอนุมัติ หรือลงวันหยุดวันลา") — ไม่เก็บการเปิดดู (GET) และการล็อกอิน
// ดักที่ระดับ onResponse ของ Fastify เพื่อไม่ต้องไล่แก้ทีละ route: ครอบ /api/v1/admin/* และ /api/v1/super-admin/*
// เขียนแบบ fire-and-forget (ล้มเหลวเงียบๆ) ไม่ให้กระทบคำขอจริง
import type { FastifyInstance } from 'fastify'
import cron from 'node-cron'
import { prisma } from './prisma'

const TRACKED = ['/api/v1/admin/', '/api/v1/super-admin/']
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const SENSITIVE_KEY = /pass|secret|token|authorization|id_card|idcard|card_no|pin$/i
const RETENTION_DAYS = 400   // เก็บ ~1 ปีเศษ

// ชื่อผู้ใช้ที่ cache ไว้ 10 นาที — กัน query User ทุกคำขอ
const nameCache = new Map<string, { name: string; role: string; at: number }>()
async function actorOf(userId: string, fallbackRole?: string) {
  const hit = nameCache.get(userId)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { first_name: true, last_name: true, email: true, role: true } })
  const v = { name: u ? (`${u.first_name} ${u.last_name}`.trim() || u.email) : userId, role: u?.role ?? fallbackRole ?? '', at: Date.now() }
  nameCache.set(userId, v)
  return v
}

// ตัดข้อมูลลับ + ตัดความยาว ก่อนเก็บ body
function redact(v: unknown, depth = 0): unknown {
  if (v == null || depth > 4) return v ?? null
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v
  if (Array.isArray(v)) return v.slice(0, 20).map(x => redact(x, depth + 1))
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 40)) {
      out[k] = SENSITIVE_KEY.test(k) ? '***' : redact(val, depth + 1)
    }
    return out
  }
  return v
}
function bodySummary(req: any): string | null {
  const ct = String(req.headers['content-type'] ?? '')
  if (ct.includes('multipart')) return '[multipart upload]'
  if (req.body == null || typeof req.body !== 'object') return null
  try {
    const s = JSON.stringify(redact(req.body))
    return s && s !== '{}' ? s.slice(0, 1500) : null
  } catch { return null }
}

export function registerAdminActivityLog(app: FastifyInstance) {
  app.addHook('onResponse', async (req: any, reply) => {
    try {
      const path = req.url.split('?')[0]
      const method = String(req.method).toUpperCase()
      if (!WRITE_METHODS.has(method)) return
      if (!TRACKED.some(p => path.startsWith(p))) return
      if (!req.userId) return   // ไม่ผ่านการยืนยันตัวตน = ไม่ใช่การกดของแอดมินคนไหน

      const a = await actorOf(req.userId, req.userRole)
      const actorName = a.name, actorRole = a.role
      const userId: string = req.userId

      await prisma.adminActivityLog.create({
        data: {
          tenant_id: req.tenantId || null,
          user_id: userId,
          actor_name: actorName.slice(0, 191),
          actor_role: actorRole.slice(0, 40),
          method,
          route: String(req.routeOptions?.url ?? req.routerPath ?? path).slice(0, 255),
          url: req.url.slice(0, 500),
          status_code: reply.statusCode,
          duration_ms: Math.round(reply.elapsedTime ?? 0),
          ip: String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim().slice(0, 64),
          user_agent: String(req.headers['user-agent'] ?? '').slice(0, 255),
          body: bodySummary(req),
        },
      })
    } catch {
      // เงียบไว้ — การบันทึก log ต้องไม่กระทบคำขอจริง
    }
  })
}

// ลบ log เก่ากว่า RETENTION_DAYS ทุกวัน 03:30 (เวลาไทย)
export function startAdminActivityCleanupCron() {
  cron.schedule('30 3 * * *', async () => {
    try {
      const cut = new Date(Date.now() - RETENTION_DAYS * 86_400_000)
      const r = await prisma.adminActivityLog.deleteMany({ where: { created_at: { lt: cut } } })
      console.log(`[admin-activity] ลบ log เก่า ${r.count} รายการ`)
    } catch (e) { console.error('[admin-activity] cleanup ล้มเหลว:', e) }
  }, { timezone: 'Asia/Bangkok' })
  console.log('[admin-activity] ตั้ง cron ล้าง log เก่า — ทุกวัน 03:30 น. (Asia/Bangkok)')
}
