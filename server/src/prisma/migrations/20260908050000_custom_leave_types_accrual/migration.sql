-- CreateIndex (ต้องมี index บน employee_id เดี่ยวๆ ให้ FK ใช้ ก่อนจะ drop composite unique เดิม)
CREATE INDEX `leave_balances_employee_id_idx` ON `leave_balances`(`employee_id`);

-- DropIndex
DROP INDEX `leave_balances_employee_id_leave_type_year_key` ON `leave_balances`;

-- AlterTable
ALTER TABLE `leave_balances` ADD COLUMN `custom_type_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `custom_type_id` VARCHAR(191) NULL,
    MODIFY `leave_type` ENUM('SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER') NOT NULL;

-- CreateTable
CREATE TABLE `tenant_leave_types` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#64748b',
    `default_days` DOUBLE NOT NULL DEFAULT 0,
    `paid` BOOLEAN NOT NULL DEFAULT true,
    `deducts_quota` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tenant_leave_types_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_accrual_rules` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `leave_type` VARCHAR(191) NOT NULL,
    `custom_type_id` VARCHAR(191) NULL,
    `days_per_month` DOUBLE NOT NULL DEFAULT 0,
    `max_balance` DOUBLE NULL,
    `max_carryover` DOUBLE NULL,
    `start_after_probation` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `last_run_ym` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_accrual_rules_tenant_id_idx`(`tenant_id`),
    UNIQUE INDEX `leave_accrual_rules_tenant_id_leave_type_custom_type_id_key`(`tenant_id`, `leave_type`, `custom_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `leave_balances_employee_id_leave_type_custom_type_id_year_key` ON `leave_balances`(`employee_id`, `leave_type`, `custom_type_id`, `year`);

-- CreateIndex
CREATE INDEX `leave_requests_custom_type_id_idx` ON `leave_requests`(`custom_type_id`);

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_custom_type_id_fkey` FOREIGN KEY (`custom_type_id`) REFERENCES `tenant_leave_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_accrual_rules` ADD CONSTRAINT `leave_accrual_rules_custom_type_id_fkey` FOREIGN KEY (`custom_type_id`) REFERENCES `tenant_leave_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_custom_type_id_fkey` FOREIGN KEY (`custom_type_id`) REFERENCES `tenant_leave_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: drift FK groups/divisions/departments/positions → tenants ตัดออก (จัดการแยก)
