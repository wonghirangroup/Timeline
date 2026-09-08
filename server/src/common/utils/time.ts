// server/src/common/utils/time.ts
// helper เวลาไทยที่ใช้ร่วมกันทั้งระบบ — เลิกคำนวณ +07:00 เอง/setUTCHours กระจายตามไฟล์
// (ดู brain/_LOG_VIEW.txt v081 บั๊ก -1 วัน จากการแนบ +07:00 ผิดที่)
//
// นิยาม:
//  bangkokNow()     — Date ที่ getUTC* คืน "ผนัง" เวลาไทย (เอาไว้ดึง วัน/เดือน/ปี/ชม./นาที ของไทย)
//  bangkokToday()   — UTC-midnight ของ "วันนี้" ตามปฏิทินไทย — ตรงกับที่คอลัมน์ @db.Date เก็บ
//  bangkokDateStr() — "YYYY-MM-DD" ของวันตามปฏิทินไทย
//  bangkokAddDays() — บวก/ลบวันจาก Date ที่เป็น UTC-midnight (ไม่โดน DST เพราะ +07:00 คงที่)

const BANGKOK_TZ = 'Asia/Bangkok'

// Date ที่ component (UTC) = เวลาไทยจริง — ใช้ต่อกับ getUTCFullYear/Month/Date/Hours…
export function bangkokNow(now: Date = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: BANGKOK_TZ }))
}

// UTC-midnight ของวันตามปฏิทินไทย ณ ตอนนี้ (เช่น 00:30 ICT ของ 9 ก.ย. → 2026-09-09T00:00:00Z)
export function bangkokToday(now: Date = new Date()): Date {
  const b = bangkokNow(now)
  return new Date(Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()))
}

// "YYYY-MM-DD" ตามปฏิทินไทย — รับ Date ใดก็ได้ (default = ตอนนี้)
export function bangkokDateStr(d: Date = new Date()): string {
  const b = bangkokNow(d)
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}-${String(b.getDate()).padStart(2, '0')}`
}

// บวก/ลบวันจาก Date ที่เป็น UTC-midnight (ผลลัพธ์ยังเป็น UTC-midnight)
export function bangkokAddDays(dateUtcMidnight: Date, days: number): Date {
  const d = new Date(dateUtcMidnight)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}
