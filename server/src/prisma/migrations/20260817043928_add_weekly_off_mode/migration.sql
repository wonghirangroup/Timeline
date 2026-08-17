-- AlterTable
ALTER TABLE `employees` ADD COLUMN `weekly_off_mode` ENUM('WEEKLY', 'MONTHLY_BATCH') NOT NULL DEFAULT 'WEEKLY';
