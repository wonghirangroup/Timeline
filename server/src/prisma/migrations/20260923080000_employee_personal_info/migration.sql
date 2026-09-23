-- AlterTable
ALTER TABLE `employees`
    ADD COLUMN `prefix` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `id_card` VARCHAR(191) NULL,
    ADD COLUMN `birthdate` DATE NULL,
    ADD COLUMN `blood_type` VARCHAR(191) NULL,
    ADD COLUMN `phone_alt` VARCHAR(191) NULL,
    ADD COLUMN `emergency_contacts` JSON NULL,
    ADD COLUMN `address_id` JSON NULL,
    ADD COLUMN `address_current` JSON NULL,
    ADD COLUMN `educations` JSON NULL,
    ADD COLUMN `skills` JSON NULL,
    ADD COLUMN `emp_type` VARCHAR(191) NULL,
    ADD COLUMN `salary` DECIMAL(10, 2) NULL,
    ADD COLUMN `notes` TEXT NULL;
