-- CreateTable
CREATE TABLE `package_plans` (
    `id` VARCHAR(191) NOT NULL,
    `plan` ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `price_monthly` INTEGER NULL,
    `color` VARCHAR(191) NOT NULL,
    `bg` VARCHAR(191) NOT NULL,
    `max_employees` INTEGER NOT NULL,
    `max_branches` INTEGER NOT NULL,
    `max_groups` INTEGER NOT NULL,
    `enabled_features` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `package_plans_plan_key`(`plan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_announcements` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `target_type` VARCHAR(191) NOT NULL,
    `target_plan` ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE') NULL,
    `target_tenant_ids` JSON NULL,
    `status` VARCHAR(191) NOT NULL,
    `sent_at` DATETIME(3) NULL,
    `sent_count` INTEGER NOT NULL DEFAULT 0,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `system_announcements_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
