-- สิทธิ์ "ปรับเงินเมื่อเช็คอินสาย" ตาม cascade กลุ่ม→สาขา→ฝ่าย→แผนก→ตำแหน่ง→บุคคล (null = inherit, ไม่มีใครตั้ง = ปรับตามกะ)
ALTER TABLE `groups`      ADD COLUMN `late_fine_enabled` BOOLEAN NULL;
ALTER TABLE `branches`    ADD COLUMN `late_fine_enabled` BOOLEAN NULL;
ALTER TABLE `divisions`   ADD COLUMN `late_fine_enabled` BOOLEAN NULL;
ALTER TABLE `departments` ADD COLUMN `late_fine_enabled` BOOLEAN NULL;
ALTER TABLE `positions`   ADD COLUMN `late_fine_enabled` BOOLEAN NULL;
ALTER TABLE `employees`   ADD COLUMN `late_fine_enabled_override` BOOLEAN NULL;
