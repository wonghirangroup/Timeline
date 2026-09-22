// server/src/common/permissions/features.ts
// รายการ "ฟีเจอร์" (โมดูล/เมนู) ที่คุมสิทธิ์แบบละเอียดได้ — key ตรงกับเมนูใน
// Sidebar ฝั่งแอดมิน (admin/src/components/layout/Sidebar.tsx) เป็น single
// source of truth ทั้งฝั่ง seed เทมเพลตและหน้า UI จัดการสิทธิ์
// (feedback 2026-09-22 "จัดการฟีเจอร์ได้อย่างละเอียด")
export interface FeatureDef {
  key: string
  label: string
  section: 'ข้อมูล' | 'การกระทำ' | 'รายงาน' | 'ตั้งค่า'
}

export const FEATURES: FeatureDef[] = [
  { key: 'branch',                 label: 'สาขา',                          section: 'ข้อมูล' },
  { key: 'employee',                label: 'พนักงาน',                       section: 'ข้อมูล' },
  { key: 'master_data',             label: 'Master Data',                   section: 'ข้อมูล' },
  { key: 'org_structure',           label: 'ผังองค์กร',                     section: 'ข้อมูล' },

  { key: 'shift',                   label: 'เช็คอิน',                       section: 'การกระทำ' },
  { key: 'leave',                   label: 'การลา และ วันหยุด',              section: 'การกระทำ' },
  { key: 'offsite',                 label: 'เช็คอินนอกสถานที่',             section: 'การกระทำ' },
  { key: 'ot',                      label: 'OT',                            section: 'การกระทำ' },
  { key: 'resignation',             label: 'คำขอลาออก',                     section: 'การกระทำ' },
  { key: 'document_request',        label: 'ขอเอกสาร HR',                   section: 'การกระทำ' },
  { key: 'announcement',            label: 'ประกาศ',                        section: 'การกระทำ' },

  { key: 'report_executive',        label: 'รายงานผู้บริหาร',               section: 'รายงาน' },
  { key: 'report_employee',         label: 'รายงานพนักงาน',                 section: 'รายงาน' },
  { key: 'report_checkin',          label: 'รายงานการเช็คอิน',              section: 'รายงาน' },
  { key: 'report_branch',           label: 'รายงานสาขา',                    section: 'รายงาน' },
  { key: 'report_holiday',          label: 'รายงานวันหยุด',                 section: 'รายงาน' },
  { key: 'report_leave',            label: 'รายงานวันลา',                   section: 'รายงาน' },
  { key: 'report_line_messages',    label: 'รายงานการส่งข้อความไลน์',       section: 'รายงาน' },

  { key: 'settings',                label: 'ตั้งค่า',                       section: 'ตั้งค่า' },
  { key: 'user_management',         label: 'ผู้ใช้งานเว็บ',                 section: 'ตั้งค่า' },
]

export const FEATURE_KEYS = FEATURES.map(f => f.key)

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'approve'
export const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'add', 'edit', 'delete', 'approve']
