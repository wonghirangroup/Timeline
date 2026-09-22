-- CreateTable
CREATE TABLE `line_message_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `recipient_type` VARCHAR(191) NOT NULL,
    `recipient_id` VARCHAR(191) NULL,
    `recipient_label` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `line_message_logs_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `line_message_logs_tenant_id_category_idx`(`tenant_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `line_message_logs` ADD CONSTRAINT `line_message_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
