-- ซิงค์ข้อมูลจากระบบเก่า (Firebase) รายวันอัตโนมัติ — toggle เปิด/ปิดได้จาก Super Admin
-- (bespoke tooling ช่วงย้ายระบบของ tenant-demo-001 เท่านั้น ไม่ใช่ feature ทั่วไปของ SaaS)
ALTER TABLE `tenants` ADD COLUMN `firebase_sync_enabled` BOOLEAN NOT NULL DEFAULT true;
