-- AlterTable
ALTER TABLE `offsite_checkins`
  MODIFY COLUMN `check_in_lat` DECIMAL(10, 8) NULL,
  MODIFY COLUMN `check_in_lng` DECIMAL(11, 8) NULL;
