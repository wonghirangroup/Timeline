-- เช็คอินวันที่จองวันหยุดประจำสัปดาห์ไว้เอง (ต่างจาก holiday: ไม่ auto grant
-- วันชดเชย ต้องรอ HR resolve) + audit log การสลับวันหยุดกันระหว่าง 2 คนที่
-- แอดมิน/HR ทำให้โดยตรง (feedback 2026-08-27)

-- AlterTable: AttendanceRecord
ALTER TABLE `attendance_records`
  ADD COLUMN `worked_on_weekly_off` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `weekly_off_resolved` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `weekly_off_resolution` ENUM('RESCHEDULE', 'COMPENSATE') NULL,
  ADD COLUMN `weekly_off_resolved_by` VARCHAR(191) NULL,
  ADD COLUMN `weekly_off_resolved_at` DATETIME(3) NULL,
  ADD COLUMN `weekly_off_resolve_note` VARCHAR(191) NULL;

-- CreateTable: WeeklyOffSwap
CREATE TABLE `weekly_off_swaps` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_a_id` VARCHAR(191) NOT NULL,
    `employee_a_off_id` VARCHAR(191) NOT NULL,
    `employee_b_id` VARCHAR(191) NOT NULL,
    `employee_b_off_id` VARCHAR(191) NOT NULL,
    `swapped_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `weekly_off_swaps_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
