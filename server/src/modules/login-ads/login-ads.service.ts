// server/src/modules/login-ads/login-ads.service.ts
// แบนเนอร์ฝั่งซ้ายของหน้า login แอดมิน — ระดับแพลตฟอร์ม ไม่ผูก tenant
import { prisma } from '../../common/utils/prisma'

export async function listLoginAds(activeOnly: boolean) {
  return prisma.loginAd.findMany({
    where: activeOnly ? { is_active: true } : undefined,
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
  })
}

export async function createLoginAd(data: { media_type?: string; image_url: string; video_url?: string | null; link_url?: string | null; title?: string | null; sort_order?: number }) {
  // ค่าเริ่มต้น sort_order = ต่อท้ายลิสต์ปัจจุบัน (มากสุด + 1) กันชนกับของเดิม
  const max = await prisma.loginAd.aggregate({ _max: { sort_order: true } })
  return prisma.loginAd.create({
    data: {
      media_type: data.media_type ?? 'IMAGE',
      image_url: data.image_url,
      video_url: data.video_url ?? null,
      link_url: data.link_url ?? null,
      title: data.title ?? null,
      sort_order: data.sort_order ?? (max._max.sort_order ?? 0) + 1,
    },
  })
}

export async function updateLoginAd(id: string, data: { media_type?: string; image_url?: string; video_url?: string | null; link_url?: string | null; title?: string | null; sort_order?: number; is_active?: boolean }) {
  try {
    return await prisma.loginAd.update({ where: { id }, data })
  } catch {
    return null
  }
}

export async function deleteLoginAd(id: string) {
  try {
    await prisma.loginAd.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

// สลับลำดับ 2 รายการ (ปุ่มเลื่อนขึ้น/ลงในหน้าจัดการ) — สลับแค่ sort_order กัน
// ไม่ต้องมี endpoint reorder แบบส่งลิสต์เต็มทั้งหมด
export async function swapLoginAdOrder(idA: string, idB: string) {
  const [a, b] = await Promise.all([
    prisma.loginAd.findUnique({ where: { id: idA } }),
    prisma.loginAd.findUnique({ where: { id: idB } }),
  ])
  if (!a || !b) return false
  await prisma.$transaction([
    prisma.loginAd.update({ where: { id: a.id }, data: { sort_order: b.sort_order } }),
    prisma.loginAd.update({ where: { id: b.id }, data: { sort_order: a.sort_order } }),
  ])
  return true
}
