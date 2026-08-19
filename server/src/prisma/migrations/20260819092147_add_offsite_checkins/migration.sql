-- CreateTable
CREATE TABLE `offsite_checkins` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `check_in_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `check_in_lat` DECIMAL(10, 8) NOT NULL,
    `check_in_lng` DECIMAL(11, 8) NOT NULL,
    `check_out_at` DATETIME(3) NULL,
    `check_out_lat` DECIMAL(10, 8) NULL,
    `check_out_lng` DECIMAL(11, 8) NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `offsite_checkins_tenant_id_idx`(`tenant_id`),
    INDEX `offsite_checkins_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `offsite_checkins` ADD CONSTRAINT `offsite_checkins_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
