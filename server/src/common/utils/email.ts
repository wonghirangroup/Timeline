// server/src/common/utils/email.ts
// ส่งอีเมลผ่าน Resend (https://resend.com/docs/api-reference/emails/send-email) ด้วย fetch ตรงๆ ไม่เพิ่ม package
// ต้องตั้ง env: RESEND_API_KEY, RESEND_FROM_EMAIL (เช่น "YooNai <no-reply@โดเมนที่ verify กับ Resend แล้ว>")
// ถ้ายังไม่ตั้ง key คืน false (ไม่ throw) — ผู้เรียกตัดสินใจเองว่าจะทำอย่างไร

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!key || !from) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      // ไม่ log เนื้อหาอีเมล/OTP — log แค่สถานะกับข้อความ error จาก Resend
      console.error('[email] Resend ส่งไม่สำเร็จ', res.status, (await res.text().catch(() => '')).slice(0, 300))
      return false
    }
    return true
  } catch (e: any) {
    console.error('[email] เรียก Resend ไม่ได้:', e?.message)
    return false
  }
}
