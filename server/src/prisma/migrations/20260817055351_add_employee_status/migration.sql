-- AlterTable
ALTER TABLE `employees` ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `status_reason` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `employee_status_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `from_status` ENUM('ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED') NULL,
    `to_status` ENUM('ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED') NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `changed_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_status_logs_tenant_id_idx`(`tenant_id`),
    INDEX `employee_status_logs_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_status_logs` ADD CONSTRAINT `employee_status_logs_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
