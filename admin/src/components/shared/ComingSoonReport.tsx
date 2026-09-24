// admin/src/components/shared/ComingSoonReport.tsx
// placeholder สำหรับหมวดรายงานใหม่ที่ยังไม่มีข้อมูล/หน้าจริงรองรับ (feedback
// 2026-09-22 "จัดกลุ่มใหม่ใน sidebar แยกรายงานเป็น 7 หมวด") — user ยืนยันให้
// รีออร์ก sidebar เต็มรูปก่อน แล้วค่อยโอนย้ายเนื้อหาแต่ละหมวดเข้ามาทีหลัง
import type { ReactNode } from 'react'

export default function ComingSoonReport({ title, icon, hint }: { title: string; icon: ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: '20px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: 'var(--accent-light, #FEF8F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          color: 'var(--accent-primary, #EC6F44)',
        }}>
          {icon}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
          {hint ?? 'หมวดรายงานนี้อยู่ระหว่างพัฒนา — จะเปิดใช้งานเร็วๆ นี้'}
        </div>
      </div>
    </div>
  )
}
