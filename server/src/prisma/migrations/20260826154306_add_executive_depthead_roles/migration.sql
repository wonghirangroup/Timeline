-- เพิ่ม role ใหม่ 2 ระดับ (feedback ลูกค้าจริง 2026-08-26): EXECUTIVE (ผู้บริหาร — อ่าน
-- อย่างเดียวทั้ง tenant) กับ DEPT_HEAD (หัวหน้าแผนก — scope เฉพาะแผนกที่ดูแล ผ่านตาราง
-- user_departments ใหม่) — ADMIN/MANAGER เดิมไม่แตะ (ยังปฏิบัติเหมือนกันตามเดิม)

-- AlterTable: ขยาย enum role ให้รองรับ 2 ค่าใหม่
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD') NOT NULL;

-- CreateTable
CREATE TABLE `user_departments` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_departments_user_id_department_id_key`(`user_id`, `department_id`),
    INDEX `user_departments_user_id_idx`(`user_id`),
    INDEX `user_departments_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
