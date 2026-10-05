-- สถานะพนักงานแบบ "โควต้าเท่าจำนวนเสาร์-อาทิตย์ของเดือน"
ALTER TABLE `employee_status_types` ADD COLUMN `off_quota_mode` ENUM('FIXED', 'WEEKENDS_IN_MONTH') NOT NULL DEFAULT 'FIXED';
