-- เปิดจองวันหยุดรายคน (พนักงานเข้าใหม่กลางเดือน): ให้จองได้แม้ช่วงจองของสาขาปิด
CREATE TABLE `weekly_off_employee_opens` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `opened_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `weekly_off_employee_opens_tenant_id_month_idx`(`tenant_id`, `month`),
    UNIQUE INDEX `weekly_off_employee_opens_employee_id_month_key`(`employee_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `weekly_off_employee_opens` ADD CONSTRAINT `weekly_off_employee_opens_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
