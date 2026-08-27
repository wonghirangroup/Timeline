-- เลิกให้ tenant อัปโหลดภาพ Loading เอง — ใช้ animation แมววิ่งตัวเดียวกันทุก
-- tenant แทน (feedback 2026-08-27) ไม่ใช้ Cloudinary อีกต่อไป

-- AlterTable: Tenant
ALTER TABLE `tenants`
  DROP COLUMN `loading_image_url`;
