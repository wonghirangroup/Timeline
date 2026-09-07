-- การตั้งค่าระดับบริษัทที่ Admin แก้ได้เอง: โปรไฟล์/แบรนด์ + นโยบายลาย้อนหลัง

ALTER TABLE `tenants`
  ADD COLUMN `address` VARCHAR(191) NULL,
  ADD COLUMN `tax_id` VARCHAR(191) NULL,
  ADD COLUMN `logo_url` VARCHAR(191) NULL,
  ADD COLUMN `primary_color` VARCHAR(191) NULL,
  ADD COLUMN `leave_backdate_days` INTEGER NULL;
