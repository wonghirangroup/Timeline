-- ปรับผังองค์กรตาม feedback ลูกค้าจริง (2026-08-26): เพิ่มชั้น "กลุ่ม" (บริษัท) คั่นระหว่าง
-- Tenant กับ Branch, สลับลำดับ Division(ฝ่าย)/Department(แผนก) ให้ตรงธรรมเนียมไทย
-- (ฝ่ายใหญ่กว่าแผนก), ตัด Section ออก เหลือ 3 ชั้น: Division > Department > Position
-- ข้อมูลเดิมมีน้อยมาก (Department 4, Division 2, Section 1, Position 1) เลย drop+recreate
-- ทั้งชุดแทนที่จะพยายาม ALTER สลับความหมายในตาราง — ข้อมูลจริงถูก re-seed ด้วยสคริปต์แยก
-- (server/src/scripts/migrate-org-to-groups.ts) หลัง migration นี้รันเสร็จ

-- DropForeignKey (ต้อง drop ก่อน ไม่งั้น DROP TABLE ตารางที่ถูกอ้างอิงไม่ได้)
ALTER TABLE `employees` DROP FOREIGN KEY `employees_position_id_fkey`;
ALTER TABLE `positions` DROP FOREIGN KEY `positions_section_id_fkey`;
ALTER TABLE `positions` DROP FOREIGN KEY `positions_division_id_fkey`;
ALTER TABLE `positions` DROP FOREIGN KEY `positions_department_id_fkey`;
ALTER TABLE `sections` DROP FOREIGN KEY `sections_division_id_fkey`;
ALTER TABLE `sections` DROP FOREIGN KEY `sections_department_id_fkey`;
ALTER TABLE `divisions` DROP FOREIGN KEY `divisions_department_id_fkey`;

-- DropTable
DROP TABLE `positions`;
DROP TABLE `sections`;
DROP TABLE `divisions`;
DROP TABLE `departments`;

-- CreateTable
CREATE TABLE `groups` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `booking_enabled` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `groups_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `divisions` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `booking_enabled` BOOLEAN NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `divisions_tenant_id_idx`(`tenant_id`),
    INDEX `divisions_group_id_idx`(`group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `division_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `booking_enabled` BOOLEAN NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `departments_tenant_id_idx`(`tenant_id`),
    INDEX `departments_division_id_idx`(`division_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `positions` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `positions_tenant_id_idx`(`tenant_id`),
    INDEX `positions_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `divisions` ADD CONSTRAINT `divisions_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `departments` ADD CONSTRAINT `departments_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `positions` ADD CONSTRAINT `positions_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Tenant.max_groups
ALTER TABLE `tenants` ADD COLUMN `max_groups` INTEGER NOT NULL DEFAULT 1;

-- AlterTable: Branch.group_id
ALTER TABLE `branches` ADD COLUMN `group_id` VARCHAR(191) NULL;
CREATE INDEX `branches_group_id_idx` ON `branches`(`group_id`);
ALTER TABLE `branches` ADD CONSTRAINT `branches_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Employee.booking_enabled_override + re-add position_id FK (ตัวเดิม drop ไปตอนต้น
-- เพราะ table positions เก่าถูกลบ — ตอนนี้ positions ใหม่สร้างแล้ว ผูกกลับเข้าไปใหม่)
-- ต้อง NULL position_id เดิมก่อน (ชี้ไปตำแหน่งเก่าที่หายไปแล้ว) ไม่งั้น ADD CONSTRAINT ล้มเหลว
-- (มีแค่ 2 แถวที่ตั้งไว้ — server/src/scripts/migrate-org-to-groups.ts จะ set กลับให้ถูกต้องหลัง seed positions ใหม่)
UPDATE `employees` SET `position_id` = NULL WHERE `position_id` IS NOT NULL;
ALTER TABLE `employees` ADD COLUMN `booking_enabled_override` BOOLEAN NULL;
ALTER TABLE `employees` ADD CONSTRAINT `employees_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
