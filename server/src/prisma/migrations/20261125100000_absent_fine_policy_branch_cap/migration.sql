-- สิทธิ์ "ปรับเงินเมื่อขาดงาน" (แยกจากปรับเงินเมื่อสาย) ตาม cascade เดียวกัน (null = inherit, ไม่มีใครตั้ง = ปรับตามกะ)
ALTER TABLE `groups`      ADD COLUMN `absent_fine_enabled` BOOLEAN NULL;
ALTER TABLE `branches`    ADD COLUMN `absent_fine_enabled` BOOLEAN NULL;
ALTER TABLE `divisions`   ADD COLUMN `absent_fine_enabled` BOOLEAN NULL;
ALTER TABLE `departments` ADD COLUMN `absent_fine_enabled` BOOLEAN NULL;
ALTER TABLE `positions`   ADD COLUMN `absent_fine_enabled` BOOLEAN NULL;
ALTER TABLE `employees`   ADD COLUMN `absent_fine_enabled_override` BOOLEAN NULL;
-- เพดานรวมวันหยุด+พักร้อนต่อเดือนรายสาขา (null = ใช้ค่าบริษัท)
ALTER TABLE `branches`    ADD COLUMN `monthly_total_cap` INT NULL;
