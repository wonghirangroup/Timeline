-- DropForeignKey
ALTER TABLE `divisions` DROP FOREIGN KEY `divisions_department_id_fkey`;

-- DropForeignKey
ALTER TABLE `positions` DROP FOREIGN KEY `positions_section_id_fkey`;

-- DropForeignKey
ALTER TABLE `sections` DROP FOREIGN KEY `sections_division_id_fkey`;

-- AlterTable
ALTER TABLE `divisions` MODIFY `department_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `employee_status_types` ADD COLUMN `off_on_public_holiday` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `off_on_saturday` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `off_on_sunday` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `positions` ADD COLUMN `department_id` VARCHAR(191) NULL,
    ADD COLUMN `division_id` VARCHAR(191) NULL,
    MODIFY `section_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sections` ADD COLUMN `department_id` VARCHAR(191) NULL,
    MODIFY `division_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `positions_division_id_idx` ON `positions`(`division_id`);

-- CreateIndex
CREATE INDEX `positions_department_id_idx` ON `positions`(`department_id`);

-- CreateIndex
CREATE INDEX `sections_department_id_idx` ON `sections`(`department_id`);

-- AddForeignKey
ALTER TABLE `divisions` ADD CONSTRAINT `divisions_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sections` ADD CONSTRAINT `sections_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sections` ADD CONSTRAINT `sections_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
