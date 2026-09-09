-- นโยบายวันหยุด (เสาร์/อาทิตย์ + โควต้าจอง/เดือน) เข้า cascade 6 ชั้น
-- Group = ค่าเริ่มต้น (เสาร์/อาทิตย์ = OFF, จอง 5 วัน/เดือน) · ชั้นล่าง null = inherit
-- (ตัด AddForeignKey groups/divisions/departments/positions -> tenants + leave_balances MODIFY
--  ออก — เป็น drift เดิมที่ตัดออกทุก migration ตั้งแต่ v085)

ALTER TABLE `groups`
    ADD COLUMN `saturday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NOT NULL DEFAULT 'OFF',
    ADD COLUMN `sunday_rule`   ENUM('WORK', 'OFF', 'OFFSITE') NOT NULL DEFAULT 'OFF',
    ADD COLUMN `booking_quota` INTEGER NOT NULL DEFAULT 5;

ALTER TABLE `branches`
    ADD COLUMN `saturday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `sunday_rule`   ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `booking_quota` INTEGER NULL;

ALTER TABLE `divisions`
    ADD COLUMN `saturday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `sunday_rule`   ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `booking_quota` INTEGER NULL;

ALTER TABLE `departments`
    ADD COLUMN `saturday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `sunday_rule`   ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `booking_quota` INTEGER NULL;

ALTER TABLE `positions`
    ADD COLUMN `saturday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `sunday_rule`   ENUM('WORK', 'OFF', 'OFFSITE') NULL,
    ADD COLUMN `booking_quota` INTEGER NULL;
