-- พนักงาน ↔ กะ many-to-many จริง (เดิมหน้า "จัดการกะ" เก็บแค่ local state ใน browser
-- ไม่เคยมี backend รองรับเลย — feedback ลูกค้า 2026-08-26 "1 คนอยู่ได้หลายกะ")

-- CreateTable
CREATE TABLE `employee_shifts` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `shift_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `employee_shifts_employee_id_shift_id_key`(`employee_id`, `shift_id`),
    INDEX `employee_shifts_tenant_id_idx`(`tenant_id`),
    INDEX `employee_shifts_employee_id_idx`(`employee_id`),
    INDEX `employee_shifts_shift_id_idx`(`shift_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_shifts` ADD CONSTRAINT `employee_shifts_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `employee_shifts` ADD CONSTRAINT `employee_shifts_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
