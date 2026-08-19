-- AlterTable
ALTER TABLE `offsite_checkins` ADD COLUMN `check_in_address` VARCHAR(500) NULL,
    ADD COLUMN `check_out_address` VARCHAR(500) NULL;
