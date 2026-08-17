-- AlterTable
ALTER TABLE `holidays` ADD COLUMN `target_branches` JSON NULL,
    ADD COLUMN `target_departments` JSON NULL;
