-- AlterTable
ALTER TABLE `attendance_records` ADD COLUMN `carried_fine` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `fine` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `is_absent` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `employees` ADD COLUMN `pending_fine` DECIMAL(8, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `shifts` ADD COLUMN `absent_fine` DECIMAL(8, 2) NULL,
    ADD COLUMN `absent_threshold` VARCHAR(191) NULL;
