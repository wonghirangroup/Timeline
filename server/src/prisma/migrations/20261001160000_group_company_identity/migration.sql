-- ข้อมูลบริษัทระดับกลุ่ม (ไว้ override ของ Tenant ต่อกลุ่ม) — null ทุกช่อง = ใช้ของ Tenant
-- เหมือนเดิม (feedback 2026-10-01 "สาขาที่โลโก้ต่างกัน" — กลุ่มเป็นคนละนิติบุคคล/แบรนด์กัน)
ALTER TABLE `groups`
  ADD COLUMN `company_name` VARCHAR(191) NULL,
  ADD COLUMN `address` VARCHAR(191) NULL,
  ADD COLUMN `tax_id` VARCHAR(191) NULL,
  ADD COLUMN `logo_url` VARCHAR(191) NULL,
  ADD COLUMN `signer_name` VARCHAR(191) NULL,
  ADD COLUMN `signer_title` VARCHAR(191) NULL;
