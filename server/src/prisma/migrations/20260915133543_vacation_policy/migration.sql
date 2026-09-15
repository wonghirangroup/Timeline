-- นโยบายวันพักร้อนชุดใหม่ (feedback 2026-09-15) — ทุกคอลัมน์ nullable / ตารางใหม่
-- ไม่กระทบ tenant เดิมจนกว่าจะตั้งค่าตำแหน่ง/วันหยุดเอง (backward compatible)

-- AlterTable: เลือกได้ต่อวันหยุดว่า +1 ที่ได้ลงประเภทไหน (default เดิม = ชดเชย)
ALTER TABLE `holidays` ADD COLUMN `compensate_leave_type` ENUM('SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER') NOT NULL DEFAULT 'COMPENSATE';

-- AlterTable: แอดมินเลือกหักโควต้าตอนอนุมัติคำขอที่ชนตำแหน่ง (null = ไม่ได้หัก)
ALTER TABLE `leave_requests` ADD COLUMN `conflict_deduct_type` ENUM('SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER') NULL;

ALTER TABLE `weekly_off_requests` ADD COLUMN `conflict_deduct_type` ENUM('SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER') NULL;

-- AlterTable: สิทธิ์พักร้อนตามอายุงาน ตั้งตรงต่อตำแหน่ง (null = ไม่มีโปรแกรมพักร้อน)
ALTER TABLE `positions` ADD COLUMN `vacation_base_days` INTEGER NULL,
    ADD COLUMN `vacation_increment_days` INTEGER NULL,
    ADD COLUMN `vacation_increment_years` INTEGER NULL;

-- CreateTable: audit log การให้/หักวันพักร้อนอัตโนมัติ
CREATE TABLE `vacation_grant_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `ym` VARCHAR(191) NOT NULL,
    `source` ENUM('UNDER_QUOTA_BONUS', 'ANNUAL_RESET', 'HOLIDAY_WORKED', 'CONFLICT_DEDUCTION', 'MANUAL') NOT NULL,
    `days` DOUBLE NOT NULL,
    `note` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vacation_grant_logs_tenant_id_idx`(`tenant_id`),
    INDEX `vacation_grant_logs_employee_id_idx`(`employee_id`),
    UNIQUE INDEX `vacation_grant_logs_employee_id_source_year_ym_key`(`employee_id`, `source`, `year`, `ym`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vacation_grant_logs` ADD CONSTRAINT `vacation_grant_logs_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
