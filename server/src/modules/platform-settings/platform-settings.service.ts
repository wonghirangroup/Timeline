// server/src/modules/platform-settings/platform-settings.service.ts
// ตั้งค่าระดับแพลตฟอร์ม (TimeLine เอง) — แถวเดียวเสมอ (id="singleton")
import { prisma } from '../../common/utils/prisma'

const SINGLETON_ID = 'singleton'

export async function getPlatformSettings() {
  const row = await prisma.platformSettings.findUnique({ where: { id: SINGLETON_ID } })
  // ยังไม่เคยตั้งค่าเลย — คืนค่าว่างทั้งหมดแทน null ทั้งแถว กันฝั่ง frontend ต้อง
  // เช็ค null ซ้อน (ทุกฟิลด์เป็น optional string อยู่แล้ว ว่าง = ยังไม่ตั้งค่า)
  return row ?? {
    id: SINGLETON_ID,
    payment_bank_name: null, payment_account_name: null, payment_account_no: null,
    payment_promptpay_id: null, payment_qr_url: null, payment_note: null,
    support_phone: null, support_line_id: null, support_email: null,
    updated_at: null,
  }
}

export async function updatePlatformSettings(data: {
  payment_bank_name?: string | null
  payment_account_name?: string | null
  payment_account_no?: string | null
  payment_promptpay_id?: string | null
  payment_qr_url?: string | null
  payment_note?: string | null
  support_phone?: string | null
  support_line_id?: string | null
  support_email?: string | null
}) {
  return prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  })
}
