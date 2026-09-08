// server/src/common/utils/features.ts
// รายชื่อฟีเจอร์ทั้งหมดที่ Super Admin เปิด/ปิดได้ต่อ tenant (Tenant.enabled_features)
// key ที่ไม่มีอยู่ใน object หรือ tenant ไม่มี record นี้เลย = ถือว่าเปิดใช้งาน (backward-compatible
// — tenant เดิมที่ไม่มีใครไปแตะไม่ต้อง backfill อะไรก็ยังใช้งานได้ปกติทุกอย่าง)
export const FEATURE_KEYS = [
  'leave_management',
  'leave_balance',
  'ot_management',
  'announcement',
  'multi_shift',
  'fine_system',
  'gps_checkin',
  'line_oa',
  'report_export',
  'feedback',
  // ── Tier A (2026-09-08) — HR lifecycle add-ons ──
  'employee_documents', // เก็บเอกสารพนักงาน + เตือนวันหมดอายุ (สัญญา/work permit/ใบขับขี่)
  'probation',          // ติดตามช่วงทดลองงาน + เตือนก่อนครบ + บันทึกผลประเมิน
  'disciplinary',       // หนังสือเตือน 1/2/3 + พนักงานรับทราบผ่าน LIFF
  'resignation',        // พนักงานยื่นลาออกผ่าน LIFF → แอดมินอนุมัติ
] as const

export type FeatureKey = typeof FEATURE_KEYS[number]

// 6 ฟีเจอร์นี้บล็อกจริงที่ backend (แยกเป็น route module ของตัวเองชัดเจน)
// อีก 4 อันฝังอยู่ใน logic ร่วมกับฟีเจอร์อื่น (fine_system/multi_shift)
// หรือยังไม่มี module จริง (report_export) หรือปิดไม่ได้จริง (line_oa = ช่องทาง login เดียว)
// — เก็บค่าไว้ให้ Super Admin สลับได้ ไม่หาย แต่ยังไม่บล็อกอะไร
export const ENFORCED_FEATURES: FeatureKey[] = [
  'leave_management',
  'leave_balance',
  'ot_management',
  'announcement',
  'feedback',
  'gps_checkin', // เช็คอินนอกสถานที่แบบปักหมุด (offsite_checkins) ผูกกับ key นี้
  'employee_documents',
  'probation',
  'disciplinary',
  'resignation',
]

export function isFeatureEnabled(enabledFeatures: unknown, key: FeatureKey): boolean {
  if (!enabledFeatures || typeof enabledFeatures !== 'object') return true
  const v = (enabledFeatures as Record<string, unknown>)[key]
  return v !== false
}
