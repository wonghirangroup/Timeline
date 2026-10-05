-- ประวัติทุกคำขอของแอดมิน (GET/POST/PUT/PATCH/DELETE + LOGIN)
CREATE TABLE `admin_activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `actor_name` VARCHAR(191) NOT NULL,
    `actor_role` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `route` VARCHAR(255) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `status_code` INTEGER NOT NULL,
    `duration_ms` INTEGER NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(255) NOT NULL,
    `body` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_activity_logs_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `admin_activity_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `admin_activity_logs_method_created_at_idx`(`method`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
