-- Policy cascade 6 ชั้น (กลุ่ม→สาขา→ฝ่าย→แผนก→ตำแหน่ง→บุคคล) + แกน leave_enabled แยกจาก booking_enabled
-- resolvePolicyFlag(): เจาะจงกว่าชนะ (first non-null) — ดู server/src/modules/group/group.service.ts
-- ค่า default ทั้งหมด = เปิด/inherit → tenant เดิมไม่เปลี่ยนพฤติกรรม

-- AlterTable: Group — เพิ่มแกน leave
ALTER TABLE `groups`
  ADD COLUMN `leave_enabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Division
ALTER TABLE `divisions`
  ADD COLUMN `leave_enabled` BOOLEAN NULL;

-- AlterTable: Department
ALTER TABLE `departments`
  ADD COLUMN `leave_enabled` BOOLEAN NULL;

-- AlterTable: Branch — เพิ่มชั้น "สาขา" เข้า cascade ทั้ง 2 แกน
ALTER TABLE `branches`
  ADD COLUMN `booking_enabled` BOOLEAN NULL,
  ADD COLUMN `leave_enabled` BOOLEAN NULL;

-- AlterTable: Position — เพิ่มชั้น "ตำแหน่ง" เข้า cascade ทั้ง 2 แกน
ALTER TABLE `positions`
  ADD COLUMN `booking_enabled` BOOLEAN NULL,
  ADD COLUMN `leave_enabled` BOOLEAN NULL;

-- AlterTable: Employee — override แกน leave รายบุคคล
ALTER TABLE `employees`
  ADD COLUMN `leave_enabled_override` BOOLEAN NULL;

-- AlterTable: LeaveRequest / WeeklyOffRequest — audit ตอนแอดมิน override การบล็อก
ALTER TABLE `leave_requests`
  ADD COLUMN `policy_override_by` VARCHAR(191) NULL;

ALTER TABLE `weekly_off_requests`
  ADD COLUMN `policy_override_by` VARCHAR(191) NULL;
