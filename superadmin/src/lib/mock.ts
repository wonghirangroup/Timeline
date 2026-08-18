// superadmin/src/lib/mock.ts
// เอาเฉพาะ mock data ที่ Super Admin pages ยังอ้างอิงอยู่จริง — คัดจาก admin/src/lib/mock.ts
// (ของเดิมมี mock พนักงาน/เช็คชื่อ/ฯลฯ อีกราว 400 บรรทัดที่ Super Admin ไม่เกี่ยวข้อง)
import type { Tenant, TenantLineConfig, PlanConfig } from '../types'

export const MOCK_TENANTS: Tenant[] = [
  { id: 'tn-01', name: 'วงษ์หิรัญ กรุ๊ป',              owner_name: 'ชาตรี วงษ์วิบูลย์สิน',  owner_email: 'chatre@wonghiran.com',   plan: 'ENTERPRISE',   status: 'ACTIVE',    branch_count: 6,  employee_count: 21, created_at: '2024-01-15', expires_at: null,         line_configured: true  },
  { id: 'tn-02', name: 'ร้านอาหารมหาชัย',               owner_name: 'สมชาย มหาชัย',           owner_email: 'somchai@mahachai.co.th', plan: 'PROFESSIONAL', status: 'ACTIVE',    branch_count: 3,  employee_count: 15, created_at: '2024-03-01', expires_at: '2027-03-01', line_configured: true  },
  { id: 'tn-03', name: 'คลินิกสุขภาพดี',                owner_name: 'แพทย์หญิงนภา รักดี',    owner_email: 'napa@sukkhaphadee.com',  plan: 'PROFESSIONAL', status: 'ACTIVE',    branch_count: 2,  employee_count: 12, created_at: '2024-04-10', expires_at: '2027-04-10', line_configured: true  },
  { id: 'tn-04', name: 'บริษัทก่อสร้างนครราชสีมา จำกัด',owner_name: 'วิชัย นครสร้าง',         owner_email: 'wichai@nakhonsang.com',  plan: 'STARTER',      status: 'SUSPENDED', branch_count: 1,  employee_count: 8,  created_at: '2023-11-05', expires_at: '2026-11-05', line_configured: false },
  { id: 'tn-05', name: 'ร้านกาแฟดอยตุง สาขาโคราช',     owner_name: 'สุภาพร ชาวไร่',          owner_email: 'supaporn@doitung.com',   plan: 'STARTER',      status: 'TRIAL',     branch_count: 1,  employee_count: 5,  created_at: '2026-05-01', expires_at: '2026-06-01', line_configured: false },
  { id: 'tn-06', name: 'ห้างสรรพสินค้าสยามโคราช',       owner_name: 'ประวิทย์ สยามไทย',       owner_email: 'prawit@siamkorat.com',   plan: 'ENTERPRISE',   status: 'ACTIVE',    branch_count: 4,  employee_count: 42, created_at: '2024-06-20', expires_at: null,         line_configured: true  },
  { id: 'tn-07', name: 'โรงแรมพักดีมีสุข',              owner_name: 'อรพิน พักดี',            owner_email: 'orapin@pakdeemisuk.com', plan: 'PROFESSIONAL', status: 'TRIAL',     branch_count: 1,  employee_count: 18, created_at: '2026-04-15', expires_at: '2026-05-15', line_configured: false },
  { id: 'tn-08', name: 'บริษัทขนส่งอีสาน จำกัด',        owner_name: 'สมศักดิ์ ขนส่งดี',      owner_email: 'somsak@isaantrans.com',  plan: 'STARTER',      status: 'ACTIVE',    branch_count: 2,  employee_count: 9,  created_at: '2025-02-10', expires_at: '2027-02-10', line_configured: true  },
]

export const MOCK_LINE_CONFIGS: TenantLineConfig[] = [
  { tenant_id: 'tn-01', line_channel_id: '2006123456', line_channel_secret: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', liff_id: '2006123456-AbCdEfGh', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-01', verified: true  },
  { tenant_id: 'tn-02', line_channel_id: '2006789012', line_channel_secret: 'q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6', liff_id: '2006789012-IjKlMnOp', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-02', verified: true  },
  { tenant_id: 'tn-03', line_channel_id: '2006345678', line_channel_secret: 'z1x2c3v4b5n6m7q8w9e0r1t2y3u4i5o6', liff_id: '2006345678-QrStUvWx', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-03', verified: true  },
  { tenant_id: 'tn-06', line_channel_id: '2006901234', line_channel_secret: 'p1a2s3d4f5g6h7j8k9l0z1x2c3v4b5n6', liff_id: '2006901234-YzAbCdEf', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-06', verified: true  },
  { tenant_id: 'tn-08', line_channel_id: '2006567890', line_channel_secret: 'm1n2b3v4c5x6z7l8k9j0h1g2f3d4s5a6', liff_id: '2006567890-GhIjKlMn', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-08', verified: false },
]

export const MOCK_PLAN_CONFIGS: PlanConfig[] = [
  {
    plan: 'STARTER', label: 'Starter', price_monthly: 990, color: '#374151', bg: '#f3f4f6',
    limits: { max_branches: 1, max_employees: 20, max_shifts_per_branch: 1, max_managers: 1 },
    features: {
      leave_management: true, ot_management: false, announcement: false,
      report_export: false, fine_system: false, multi_shift: false,
      leave_balance: false, line_oa: true, gps_checkin: true, feedback: false,
    },
  },
  {
    plan: 'PROFESSIONAL', label: 'Professional', price_monthly: 2490, color: '#2563eb', bg: '#dbeafe',
    limits: { max_branches: 5, max_employees: 100, max_shifts_per_branch: 2, max_managers: 5 },
    features: {
      leave_management: true, ot_management: true, announcement: true,
      report_export: true, fine_system: true, multi_shift: true,
      leave_balance: true, line_oa: true, gps_checkin: true, feedback: true,
    },
  },
  {
    plan: 'ENTERPRISE', label: 'Enterprise', price_monthly: 0, color: '#7c3aed', bg: '#ede9fe',
    limits: { max_branches: -1, max_employees: -1, max_shifts_per_branch: -1, max_managers: -1 },
    features: {
      leave_management: true, ot_management: true, announcement: true,
      report_export: true, fine_system: true, multi_shift: true,
      leave_balance: true, line_oa: true, gps_checkin: true, feedback: true,
    },
  },
]
