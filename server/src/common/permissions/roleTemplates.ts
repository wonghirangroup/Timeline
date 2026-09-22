// server/src/common/permissions/roleTemplates.ts
// เทมเพลตสิทธิ์เริ่มต้นต่อ role — ใช้ตอน seed สิทธิ์ให้บัญชีที่เพิ่งสร้าง/
// เพิ่งได้รับสิทธิ์แอดมิน (ดู seedPermissionsFromTemplate ใน permission.service.ts)
// เป็นแค่ "ค่าเริ่มต้น" เท่านั้น — แก้ไขรายบัญชีทีหลังได้อิสระ ไม่ผูกกับ role ตลอดไป
import { FEATURE_KEYS, type PermissionAction } from './features'

export type PermissionSet = Record<PermissionAction, boolean>
export type FeatureTemplate = Record<string, PermissionSet>

const FULL: PermissionSet    = { view: true,  add: true,  edit: true,  delete: true,  approve: true }
const VIEW_ONLY: PermissionSet = { view: true,  add: false, edit: false, delete: false, approve: false }
const NONE: PermissionSet    = { view: false, add: false, edit: false, delete: false, approve: false }
const APPROVE_ONLY: PermissionSet = { view: true, add: false, edit: false, delete: false, approve: true }

// ฟีเจอร์ที่เป็น "คำขอที่ต้องอนุมัติ" — หัวหน้าแผนก (DEPT_HEAD) เห็น+อนุมัติได้
// เฉพาะกลุ่มนี้ (ขอบเขตพนักงานถูกจำกัดแยกอีกชั้นด้วย resolveDeptScope อยู่แล้ว
// ไม่เกี่ยวกับตารางนี้)
const DEPT_HEAD_APPROVAL_FEATURES = ['leave', 'ot', 'resignation', 'document_request']
const DEPT_HEAD_VIEW_FEATURES = ['shift', 'employee']

function buildFull(): FeatureTemplate {
  return Object.fromEntries(FEATURE_KEYS.map(k => [k, { ...FULL }]))
}
function buildViewOnly(): FeatureTemplate {
  return Object.fromEntries(FEATURE_KEYS.map(k => [k, { ...VIEW_ONLY }]))
}
function buildDeptHead(): FeatureTemplate {
  return Object.fromEntries(FEATURE_KEYS.map(k => {
    if (DEPT_HEAD_APPROVAL_FEATURES.includes(k)) return [k, { ...APPROVE_ONLY }]
    if (DEPT_HEAD_VIEW_FEATURES.includes(k)) return [k, { ...VIEW_ONLY }]
    return [k, { ...NONE }]
  }))
}

// ADMIN/MANAGER = เต็มทุกฟีเจอร์เหมือนกันทุกประการ (feedback เดิม "Manager=Admin"
// ไม่แยก scope ระหว่างสอง role นี้)
export const ROLE_TEMPLATES: Record<'ADMIN' | 'MANAGER' | 'EXECUTIVE' | 'DEPT_HEAD', FeatureTemplate> = {
  ADMIN:     buildFull(),
  MANAGER:   buildFull(),
  EXECUTIVE: buildViewOnly(), // ตรงกับ useIsReadOnly() ฝั่ง frontend เดิม
  DEPT_HEAD: buildDeptHead(),
}

// SUPER_ADMIN ไม่ seed แถวเลย — bypass ทุกจุดตรงๆ ในโค้ด (คนละแอป ไม่มี tenant_id)
