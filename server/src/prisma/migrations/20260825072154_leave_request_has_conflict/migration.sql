-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `has_conflict` BOOLEAN NOT NULL DEFAULT false;
