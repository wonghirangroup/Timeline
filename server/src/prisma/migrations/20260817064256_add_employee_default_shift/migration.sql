-- AlterTable
ALTER TABLE `employees` ADD COLUMN `default_shift_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `employees_default_shift_id_idx` ON `employees`(`default_shift_id`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_default_shift_id_fkey` FOREIGN KEY (`default_shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
