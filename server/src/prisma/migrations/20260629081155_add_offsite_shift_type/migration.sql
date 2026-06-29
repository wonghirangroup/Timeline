-- AlterTable
ALTER TABLE `attendance_records` ADD COLUMN `is_outside_area` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_outside_shift` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `check_in_method` ENUM('LIFF', 'QR', 'ADMIN', 'WEB_FALLBACK', 'SELFIE', 'OFFSITE') NOT NULL DEFAULT 'LIFF';

-- AlterTable
ALTER TABLE `branches` ADD COLUMN `geo_mode` ENUM('WARN', 'BLOCK') NOT NULL DEFAULT 'WARN',
    ADD COLUMN `gps_radius` INTEGER NOT NULL DEFAULT 200,
    ADD COLUMN `lat` DECIMAL(10, 8) NULL,
    ADD COLUMN `lng` DECIMAL(11, 8) NULL;

-- AlterTable
ALTER TABLE `employees` ADD COLUMN `department` VARCHAR(191) NULL,
    ADD COLUMN `hired_at` DATE NULL,
    ADD COLUMN `nickname` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `holidays` ADD COLUMN `recurring` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `type` ENUM('NATIONAL', 'RELIGIOUS', 'COMPANY') NOT NULL DEFAULT 'NATIONAL';

-- AlterTable
ALTER TABLE `leave_balances` MODIFY `leave_type` ENUM('SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE') NOT NULL;

-- AlterTable
ALTER TABLE `leave_requests` MODIFY `leave_type` ENUM('SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE') NOT NULL;

-- AlterTable
ALTER TABLE `shifts` ADD COLUMN `gps_radius` INTEGER NULL,
    ADD COLUMN `late_fine_1` DECIMAL(8, 2) NULL,
    ADD COLUMN `late_fine_2` DECIMAL(8, 2) NULL,
    ADD COLUMN `late_threshold_1` VARCHAR(191) NULL,
    ADD COLUMN `late_threshold_2` VARCHAR(191) NULL,
    ADD COLUMN `min_checkout` VARCHAR(191) NULL,
    ADD COLUMN `shift_type` ENUM('REGULAR', 'SPECIAL', 'OFFSITE') NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE `tenant_line_configs` ADD COLUMN `line_channel_access_token` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `weekly_off_requests` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `week_start` DATE NOT NULL,
    `day_of_week` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reject_note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `weekly_off_requests_tenant_id_idx`(`tenant_id`),
    INDEX `weekly_off_requests_employee_id_idx`(`employee_id`),
    UNIQUE INDEX `weekly_off_requests_employee_id_week_start_key`(`employee_id`, `week_start`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weekly_off_periods` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `is_open` BOOLEAN NOT NULL DEFAULT true,
    `deadline` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `weekly_off_periods_tenant_id_idx`(`tenant_id`),
    UNIQUE INDEX `weekly_off_periods_tenant_id_branch_id_month_key`(`tenant_id`, `branch_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `weekly_off_requests` ADD CONSTRAINT `weekly_off_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_off_periods` ADD CONSTRAINT `weekly_off_periods_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
