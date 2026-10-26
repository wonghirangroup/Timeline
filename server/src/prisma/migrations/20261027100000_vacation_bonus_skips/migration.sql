-- แอดมินกำหนดล่วงหน้าว่า "ไม่ให้" โบนัสพักร้อนสิ้นเดือนของใคร (ใช้ทั้งหน้าตรวจโบนัสและ cron อัตโนมัติ)
CREATE TABLE `vacation_bonus_skips` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `ym` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vacation_bonus_skips_tenant_id_ym_idx`(`tenant_id`, `ym`),
    UNIQUE INDEX `vacation_bonus_skips_employee_id_ym_key`(`employee_id`, `ym`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `vacation_bonus_skips` ADD CONSTRAINT `vacation_bonus_skips_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
