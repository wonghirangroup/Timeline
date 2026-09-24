-- CreateTable
CREATE TABLE `platform_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `payment_bank_name` VARCHAR(191) NULL,
    `payment_account_name` VARCHAR(191) NULL,
    `payment_account_no` VARCHAR(191) NULL,
    `payment_promptpay_id` VARCHAR(191) NULL,
    `payment_qr_url` VARCHAR(191) NULL,
    `payment_note` TEXT NULL,
    `support_phone` VARCHAR(191) NULL,
    `support_line_id` VARCHAR(191) NULL,
    `support_email` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
