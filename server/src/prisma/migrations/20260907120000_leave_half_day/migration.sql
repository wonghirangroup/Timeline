-- ลาครึ่งวัน / ลาระบุช่วงเวลา — days เปลี่ยนเป็น Float, +leave_period, +start_time/end_time
-- ค่าเดิมที่เป็นจำนวนเต็มแปลงเป็น float อัตโนมัติ (1 -> 1) และ leave_period default = FULL

-- AlterTable: LeaveRequest
ALTER TABLE `leave_requests`
  MODIFY COLUMN `days` DOUBLE NOT NULL,
  ADD COLUMN `leave_period` ENUM('FULL', 'MORNING', 'AFTERNOON', 'CUSTOM') NOT NULL DEFAULT 'FULL',
  ADD COLUMN `start_time` VARCHAR(191) NULL,
  ADD COLUMN `end_time` VARCHAR(191) NULL;

-- AlterTable: LeaveBalance
ALTER TABLE `leave_balances`
  MODIFY COLUMN `total_days` DOUBLE NOT NULL,
  MODIFY COLUMN `used_days` DOUBLE NOT NULL DEFAULT 0;
