-- Admin เปิด/ปิดเมนู "ยื่นลาออก" ใน LIFF ได้เอง
ALTER TABLE `tenants` ADD COLUMN `self_resignation_enabled` BOOLEAN NOT NULL DEFAULT true;
