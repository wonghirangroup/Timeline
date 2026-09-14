-- AlterTable
ALTER TABLE `weekly_off_swaps` MODIFY `swapped_by` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `weekly_off_swap_requests` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `requester_employee_id` VARCHAR(191) NOT NULL,
    `requester_off_id` VARCHAR(191) NOT NULL,
    `target_employee_id` VARCHAR(191) NOT NULL,
    `target_off_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `responded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `weekly_off_swap_requests_tenant_id_idx`(`tenant_id`),
    INDEX `weekly_off_swap_requests_requester_employee_id_idx`(`requester_employee_id`),
    INDEX `weekly_off_swap_requests_target_employee_id_idx`(`target_employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `weekly_off_swap_requests` ADD CONSTRAINT `weekly_off_swap_requests_requester_employee_id_fkey` FOREIGN KEY (`requester_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_off_swap_requests` ADD CONSTRAINT `weekly_off_swap_requests_target_employee_id_fkey` FOREIGN KEY (`target_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
