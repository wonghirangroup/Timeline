-- AlterTable
ALTER TABLE `users` ADD COLUMN `recovery_email` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `users_recovery_email_idx` ON `users`(`recovery_email`);
